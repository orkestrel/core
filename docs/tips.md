# Tips

- Prefer explicit dependency edges in `orchestrator.register` to control startup order.
- Use `container.createChild()` for request/job scoped lifetimes; always `await scope.destroy()`.
- Keep adapters side-effect free on import. Do work in `onStart`/`onStop`/`onDestroy` if needed.
- For tests, use `tsx --test` (or your runner) and `tsc --noEmit` for type checking.
- Use `orchestrator().list()` and `container().list()` (helpers export list) only for debugging; prefer passing instances explicitly in libraries.
- In TS configs, alias `@orkestrel/core` to `src` for local dev; in apps consuming the package, import from `@orkestrel/core` normally.
- Keep port interfaces small and stable; adapters can vary by environment (browser/server).
- Aggregate lifecycle errors are thrown at the end of stop/destroy; inspect `.errors`.

