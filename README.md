# Orkestrel Core

Minimal, strongly-typed adapter/port toolkit for TypeScript. Compose capabilities with tokens, wire implementations via a tiny DI container, and drive lifecycles deterministically with an orchestrator.

- Package: `@orkestrel/core`
- TypeScript-first, ESM-only
- Works in Node and the browser

Quick links
- Overview: [docs/overview.md](docs/overview.md)
- Install: [docs/install.md](docs/install.md)
- Start (Getting Started): [docs/start.md](docs/start.md)
- Concepts: [docs/concepts.md](docs/concepts.md)
- Patterns: [docs/patterns.md](docs/patterns.md)
- Providers & Lifetimes: [docs/providers-and-lifetimes.md](docs/providers-and-lifetimes.md)
- Tips: [docs/tips.md](docs/tips.md)
- Ecosystems: [docs/ecosystems.md](docs/ecosystems.md)
- Examples: [docs/examples.md](docs/examples.md)
- API Reference: [docs/api.md](docs/api.md)
- Contribute: [docs/contribute.md](docs/contribute.md)

## Quickstart (≈60 seconds)

1) Install
```sh
npm install @orkestrel/core
```

2) Define a port and token
```ts
import { createPortTokens } from '@orkestrel/core'

interface EmailPort { send(to: string, subject: string, body: string): Promise<void> }
const Ports = createPortTokens({ email: {} as EmailPort })
```

3) Register and start
```ts
import { container, orchestrator, register } from '@orkestrel/core'

class ConsoleEmail implements EmailPort {
  async send(to: string, subject: string, body: string) {
    console.log('[email]', { to, subject, body })
  }
}

await orchestrator().start([
  register(Ports.email, { useFactory: () => new ConsoleEmail() }),
])
```

4) Use and cleanup
```ts
await container().resolve(Ports.email).send('me@example.com', 'Hi', 'Welcome!')
await orchestrator().stopAll()
await orchestrator().destroyAll()
```

## Mental model (at a glance)
- Ports: TypeScript interfaces that describe capabilities (Email, Logger, etc.).
- Tokens: unique runtime identifiers for those port interfaces.
- Container: tiny DI that registers providers (value/factory/class) and resolves singletons.
- Orchestrator: starts/stops/destroys Lifecycle components in dependency order with timeouts and events.

Startup
- See [Start](docs/start.md) for a quick way to wire and run your app, and [Patterns](docs/patterns.md) for alternatives.

Source
- Public entrypoint: `src/index.ts`
- Browse source: [`src/`](src)

Run locally
```sh
npm run check
npm run format
npm test
npm run example:simple
npm run example:large
```

Publishing
- `prepublishOnly` runs type-checks and build so only `src` is compiled to `dist`.

Issues & Discussions
- Please file issues and PRs with clear reproduction and expected behavior.
