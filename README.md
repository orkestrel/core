# Orkestrel Core

Minimal, strongly-typed adapter/port toolkit for TypeScript. Compose capabilities with tokens, wire implementations via a tiny DI container, and drive lifecycles deterministically with an orchestrator.

- Package: `@orkestrel/core`
- TypeScript-first, ESM-only
- Works in Node and the browser (Node 18+)

## Install
```sh
npm install @orkestrel/core
```

## Documentation
- Overview: docs/guide/overview.md
- Start: docs/guide/start.md
- Concepts: docs/guide/concepts.md
- Core: docs/guide/core.md
- Examples: docs/guide/examples.md
- Tips: docs/guide/tips.md
- Tests: docs/guide/tests.md
- Contribute: docs/guide/contribute.md
- FAQ: docs/guide/faq.md
- API: docs/api/index.md
- LLM: docs/llms.txt
- LLM Full: docs/llms-full.txt

Notes
- Providers are synchronous (no async factories or Promise values). Do async work in Lifecycle hooks.
- Deterministic start/stop/destroy order with timeouts and rollback on failures.

## Scripts
```sh
npm run check   # typecheck
npm run test    # unit tests
npm run docs    # generate API docs into docs/api
npm run build   # build ESM + types into dist
```

Links
- Issues: https://github.com/orkestrel/core/issues
