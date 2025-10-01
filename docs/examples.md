# Examples

This repository includes two runnable examples to illustrate both a simple and a larger composition.

## Simple (single-file)
- Path: [examples/simple.ts](../examples/simple.ts)
- Shows how to define a small port, register a provider, use the helpers, and run lifecycle.
- Uses the auto-registered default container/orchestrator via `container()`/`orchestrator()`.
- Demonstrates strict resolution with `resolve(token)`.

Run:
```bat
npm run example:simple
```

## Large (multi-file)
- Entry: [examples/large/app.ts](../examples/large/app.ts)
- Ports: [examples/large/infra/ports.ts](../examples/large/infra/ports.ts)
- Feature file: [examples/large/modules/user.ts](../examples/large/modules/user.ts)

Highlights
- Uses `container()`/`orchestrator()` helpers with auto-registered defaults (named instances optional).
- Registers infra providers (config, clock, logger, email) in the app entry.
- Wires a `user` feature in a separate file with explicit dependencies.
- Demonstrates lifecycle start/stop/destroy and cross-file usage via helpers.
- Shows resolving multiple tokens at once with `container().resolve({ ... })`.

Run:
```bat
npm run example:large
```

## Register forms cheat sheet

Tuple/Object inject forms (best inference):
```ts
// Factory with positional injection
container().register(Ports.repo, {
  useFactory: (cfg: Config, log: Logger) => new Repo(cfg, log),
  inject: [Ports.config, Ports.logger],
})

// Factory with named-object injection
container().register(Ports.svc, {
  useFactory: ({ repo, bus }: { repo: Repo, bus: Bus }) => new Service(repo, bus),
  inject: { repo: Ports.repo, bus: Ports.bus },
})

// Class with positional injection
container().register(Ports.bus, {
  useClass: EventBus,
  inject: [Ports.config, Ports.logger],
})
```

No-deps forms (optionally receive Container):
```ts
// Factory without inject
container().register(Ports.clock, { useFactory: () => new SystemClock() })
container().register(Ports.email, { useFactory: c => new Email(c.resolve(Ports.logger)) })

// Class without inject
class ZeroArg {}
class NeedsContainer { constructor(private readonly c: Container) {} }
container().register(Ports.zero, { useClass: ZeroArg })
container().register(Ports.needs, { useClass: NeedsContainer }) // container is passed based on constructor arity
```

Value forms:
```ts
container().register(Ports.config, { useValue: { appName: 'Acme' } })
container().register(Ports.answer, 42)
```

## Class provider that takes Container explicitly

When a class constructor accepts one argument, the container will pass itself to the constructor. This lets you manually resolve and cache dependencies.

```ts
import { container, type Container } from '@orkestrel/core'

class NeedsContainer {
  private logger: Logger
  constructor(c: Container) {
    this.logger = c.resolve(Ports.logger)
  }
  doWork() {
    this.logger.info('work!')
  }
}

container().register(Ports.needsContainer, { useClass: NeedsContainer })
```

See also
- Composition patterns: [docs/patterns.md](./patterns.md)
