# Overview

<!-- Template: This guide provides the mental model for the package -->

@orkestrel/core is a minimal, strongly-typed toolkit for composing applications with ports and adapters in TypeScript.

## What it provides

- **Tokens and ports** — Typed symbols for decoupled contracts
- **Dependency injection** — Minimal container with singleton adapters
- **Deterministic lifecycle** — Start, stop, destroy with timeouts and rollback
- **Orchestration** — Topological ordering with dependency-aware phases
- **Built-in adapters** — Logger, diagnostics, emitter, event bus, queue, registry

## What it is not

This is not a framework with hidden runtime magic. You assemble tokens and providers explicitly, keep providers synchronous, and move async work into lifecycle hooks.

## Key principles

- **Strong typing** — End-to-end type safety with token contracts
- **Synchronous providers** — Factories/values must not be async (enforced)
- **Deterministic lifecycle** — Hook timeouts and rollback on failures
- **Topological ordering** — Start/stop/destroy in dependency order

## Building blocks

| Component             | Purpose                                  |
|-----------------------|------------------------------------------|
| `createToken`         | Create typed token symbols               |
| `Adapter`             | Base class for components with lifecycle |
| `ContainerAdapter`    | DI container for registering adapters    |
| `OrchestratorAdapter` | Lifecycle management in dependency order |

## Diagnostics

Failures carry stable codes for debugging:

| Code              | Description                       |
|-------------------|-----------------------------------|
| ORK1006           | Missing provider                  |
| ORK1007           | Duplicate registration            |
| ORK1008           | Unknown dependency                |
| ORK1009           | Cycle detected                    |
| ORK1013/1014/1017 | Phase errors (start/stop/destroy) |
| ORK1020/1021/1022 | Lifecycle errors                  |

## Guide navigation

| Guide                         | Description                                |
|-------------------------------|--------------------------------------------|
| [Start](./start.md)           | Installation and 5-minute tour             |
| [Concepts](./concepts.md)     | Tokens, adapters, lifecycle, orchestration |
| [Core](./core.md)             | Built-in adapters and runtime              |
| [Examples](./examples.md)     | Copy-pasteable patterns                    |
| [Tips](./tips.md)             | Patterns and troubleshooting               |
| [Tests](./tests.md)           | Testing guidance                           |
| [FAQ](./faq.md)               | Common questions                           |
| [Contribute](./contribute.md) | Development workflow                       |

