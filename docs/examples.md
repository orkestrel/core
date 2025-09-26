# Examples

This repository includes two runnable examples to illustrate both a simple and a larger composition.

## Simple (single-file)
- Path: [examples/simple.ts](../examples/simple.ts)
- Shows how to define a small port, register a provider, use the helpers, and run lifecycle.
- Uses top-level await (no main guard) to keep the example approachable.

Run:
```sh
npm run example:simple
```

## Large (multi-file)
- Entry: [examples/large/app.ts](../examples/large/app.ts)
- Ports: [examples/large/infra/ports.ts](../examples/large/infra/ports.ts)
- Module: [examples/large/modules/user.ts](../examples/large/modules/user.ts)

Highlights
- Uses `Container`/`Orchestrator` helpers (`container`, `orchestrator`) to set and get default instances.
- Registers infra providers (logger, email) in the app entry.
- Registers a `user` module in a separate file with explicit dependencies.
- Demonstrates lifecycle start/stop/destroy and cross-file usage via helpers.

Run:
```sh
npm run example:large
```

Tip: Review the code for patterns to scale up (see `docs/patterns.md`).
