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
