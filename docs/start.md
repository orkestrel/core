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

// Cleanup (single call)
await orchestrator().destroy()
```

When to use stop() vs destroy()
- destroy(): Preferred for application shutdown. It stops any started components as needed and then destroys all lifecycles in reverse dependency order, and finally destroys the container. One call is sufficient.
- stop(): Use when you need to pause running components without tearing them down, for example to perform maintenance or to later start again in the same process. It aggregates stop errors and respects per-component timeouts.

Next steps
- Read Concepts: `docs/concepts.md`
- Browse Patterns: `docs/patterns.md`
- Full API reference: `docs/api.md`

## Lifecycle options (quick)
- hookTimeoutMs (default 5000): max time for each hook (`onStart`, `onStop`, `onDestroy`) and `onTransition`.
- onTransitionFilter(from, to, hook): decide whether to run `onTransition` for a given phase.
- emitInitialState (default true): when false, suppresses the initial deferred `stateChange('created')` event.
- emitter: Lifecycle creates a default internal emitter so `on('stateChange', ...)` works without configuration. To integrate with a shared emitter, pass `opts.emitter` when constructing your Lifecycle subclass.

Example:
```ts
class Service extends Lifecycle {
  protected async onStart() { /* ... */ }
  protected async onStop() { /* ... */ }
}

const s = new Service({ hookTimeoutMs: 200, emitInitialState: false, onTransitionFilter: (_f, _t, hook) => hook === 'start' })
s.on('stateChange', s => console.log('state:', s))
await s.start()
```
