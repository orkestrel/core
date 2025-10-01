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
import { createPortTokens, container, orchestrator, register } from '@orkestrel/core'

// Define a small port
interface EmailPort { send(to: string, subject: string, body: string): Promise<void> }
const Ports = createPortTokens({ email: {} as EmailPort })

class ConsoleEmail implements EmailPort {
  async send(to: string, subject: string, body: string) {
    console.log('[email]', { to, subject, body })
  }
}

// Register and start (with optional timeouts)
await orchestrator().start([
  register(Ports.email, { useFactory: () => new ConsoleEmail() }),
])

// Use (strict resolution)
await container().resolve(Ports.email).send('me@example.com', 'Hi', 'Welcome!')

// Cleanup
await orchestrator().stopAll()
await orchestrator().destroyAll()
```

Large app (multi-file pattern)
- Entry file wires infra (see `examples/large/app.ts`)
- Feature modules register their own providers (see `examples/large/modules/user.ts`)
- Use orchestrator dependencies for deterministic ordering

Next steps
- Read Concepts: `docs/concepts.md`
- Browse Patterns: `docs/patterns.md`
- Full API reference: `docs/api.md`
