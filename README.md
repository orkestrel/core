# Orkestrel Core

Minimal, strongly-typed adapter/port toolkit for TypeScript. Compose capabilities with tokens, wire Adapter classes via a tiny DI container, and drive lifecycles deterministically with an orchestrator.

- Package: `@orkestrel/core`
- TypeScript-first, ESM-only
- Works in Node and the browser (Node 18+)

## Install
```sh
npm install @orkestrel/core
```

## Documentation
- Overview: https://github.com/orkestrel/core/blob/main/guides/overview.md
- Start: https://github.com/orkestrel/core/blob/main/guides/start.md
- Concepts: https://github.com/orkestrel/core/blob/main/guides/concepts.md
- Core: https://github.com/orkestrel/core/blob/main/guides/core.md
- Examples: https://github.com/orkestrel/core/blob/main/guides/examples.md
- Tips: https://github.com/orkestrel/core/blob/main/guides/tips.md
- Tests: https://github.com/orkestrel/core/blob/main/guides/tests.md
- Contribute: https://github.com/orkestrel/core/blob/main/guides/contribute.md
- FAQ: https://github.com/orkestrel/core/blob/main/guides/faq.md

Notes
- All components extend `Adapter` base class with singleton pattern
- Adapter classes registered in Container: `{ adapter: AdapterClass }`
- Lifecycle managed via static methods: `MyAdapter.start()`, `MyAdapter.stop()`, `MyAdapter.destroy()`
- Dependencies specified explicitly: `{ adapter: MyClass, dependencies: [TokenA, TokenB] }`
- Async work happens in lifecycle hooks (`onStart`, `onStop`, `onDestroy`) with timeouts
- Deterministic start/stop/destroy order with rollback on failures

## Scripts
```sh
npm run check   # typecheck
npm run test    # unit tests
npm run docs    # generate API docs into docs/api
npm run build   # build ESM + types into dist
```

Links
- Issues: https://github.com/orkestrel/core/issues

## License

MIT © 2025 Orkestrel
