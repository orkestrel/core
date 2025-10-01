# Tips

- Prefer explicit dependency edges in `orchestrator.register` to control startup order.
- Use `container.createChild()` for request/job scoped lifetimes; always `await scope.destroy()`.
- Keep adapters side-effect free on import. Do work in `onStart`/`onStop`/`onDestroy` if needed.
- For tests, use `tsx --test` (or your runner) and `tsc --noEmit` for type checking.
- Use `orchestrator.list()` and `container.list()` (helpers expose `list`) only for debugging; prefer passing instances explicitly in libraries.
- In TS configs, alias `@orkestrel/core` to `src` for local dev; in apps consuming the package, import from `@orkestrel/core` normally.
- Keep port interfaces small and stable; adapters can vary by environment (browser/server).
- Aggregate lifecycle errors are thrown at the end of stop/destroy; inspect `.errors`.
- Use `onTransition(from, to, hook)` in `Lifecycle` to log or instrument transitions, and gate it with `onTransitionFilter` to target specific hooks.
- `hookTimeoutMs` is a safety cap (default 5000ms) for each lifecycle operation: it bounds the time for the primary hook and `onTransition` together. If exceeded, a `TimeoutError` is thrown and emitted; it’s not a delay. Tune per component based on expected IO (set low to fail fast, or higher for slow initializations).
- Start/stop/destroy run in parallel within each dependency layer; avoid global side effects in hooks or guard with locks.
- Default `Lifecycle` hook timeout is 5000ms; you can override per component (via `LifecycleOptions` or orchestrator timeouts) or set orchestrator defaults.
- See Providers & Lifetimes for ownership details and async provider guard behavior.

## Diagnostics (simple and actionable)
- All framework errors use a stable, prefixed format: `[Orkestrel][ORK####] Message…`.
- Each error may include a concise help link. Follow it for a short fix guide.
- Common codes:
  - ORK1008 Unknown dependency (you referenced a token that wasn’t registered)
  - ORK1009 Cycle detected (A depends on B depends on A)
  - ORK1010/1011/1012 Async provider guard (keep async in lifecycle hooks, not providers)
  - ORK1013/1014/1015 Aggregated start/stop/destroy errors
  - ORK1016 Errors during container destroy
  - ORK1020 Invalid lifecycle transition (called start/stop/destroy out of order)
  - ORK1021 Lifecycle hook timeout (hook took longer than allowed)

Quick example: catching aggregated errors
```ts
try {
  await app.stopAll()
} catch (e) {
  if (e instanceof AggregateLifecycleError) {
    for (const d of e.details) {
      console.error(`${d.tokenDescription} failed during ${d.phase}${d.timedOut ? ' (timed out)' : ''} after ${d.durationMs}ms:`, d.error.message)
      // Probable fixes:
      // - Check dependencies for missing registrations (ORK1008)
      // - Increase or tune timeouts for slow operations (ORK1021)
      // - Move async setup to onStart instead of useFactory/useValue (ORK1010–1012)
    }
  } else {
    throw e
  }
}
```

Tips to fix common issues
- Unknown dependency: register the missing token before use, or pass it as an explicit dependency.
- Cycle detected: break the cycle (split responsibilities, invert a call, or introduce a small mediator).
- Async provider guard: return sync values from providers; do async work in `onStart`/`onStop`.
- Hook timeout: lower the work done in the hook or increase the timeout where appropriate.
- Container destroy errors: ensure `stop()`/`destroy()` handle cleanup even after partial failures.
