# Overview

Orkestrel Core is a minimal, strongly-typed adapter/port framework for TypeScript. It centers on:

- Ports: interfaces describing capabilities (Email, Logger, etc.)
- Tokens: unique runtime identifiers for those port interfaces
- Adapters: implementations that satisfy ports (swap for different environments)
- Container: a small DI container to register and resolve components
- Orchestrator: deterministic lifecycle ordering with dependencies
- Lifecycle: safe transitions with timeouts and events

Highlights
- TypeScript-first, ESM-only
- Works in Node and the browser
- No heavy dependencies
- Strict DI, explicit wiring

Recommendation
- Prefer `orchestrator.start([...])` at your app entry to declare all registrations in one place and start lifecycles in dependency order. Use `register()` + `startAll()` later when you need fine-grained control (e.g., tests or incremental wiring).

See the examples for a tiny single-file app and a larger multi-file composition:
- examples/simple.ts
- examples/large/app.ts
