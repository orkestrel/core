# Start

This quick guide gets you from install to running in minutes.

Prereqs
- Node 18+
- TypeScript 5+
- ESM (NodeNext) module resolution

Install
```sh
npm install @orkestrel/core
```

Hello World (single file)
```ts
import { Container, Orchestrator, createPortTokens, container, orchestrator } from '@orkestrel/core'

// Define a small port
interface EmailPort { send(to: string, subject: string, body: string): Promise<void> }
const Ports = createPortTokens({ email: {} as EmailPort })

class ConsoleEmail implements EmailPort {
  async send(to: string, subject: string, body: string) {
    console.log('[email]', { to, subject, body })
  }
}

// Set default instances
const c = new Container(); container.set(c)
const app = new Orchestrator(c); orchestrator.set(app)

// Register and start
await orchestrator().start([
  { token: Ports.email, provider: { useFactory: () => new ConsoleEmail() } },
])

// Use
await container().get(Ports.email).send('me@example.com', 'Hi', 'Welcome!')

// Cleanup
await orchestrator().stopAll()
await orchestrator().destroyAll()
```

Large app (multi-file pattern)
- Entry file wires infra and sets helpers (see `examples/large/app.ts`)
- Feature modules register their own providers (see `examples/large/modules/user.ts`)
- Use orchestrator dependencies for deterministic ordering

Next steps
- Read Concepts: `docs/concepts.md`
- Browse Patterns: `docs/patterns.md`
- Full API reference: `docs/api.md`

