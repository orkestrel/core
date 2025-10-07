# Examples

Quick examples showing the main APIs.

## Start a component

```ts
import { Adapter, createToken, orchestrator, register } from '@orkestrel/core'

interface EmailPort { send(to: string, subject: string, body: string): Promise<void> }
const Ports = { email: createToken<EmailPort>('email') }

class ConsoleEmail extends Adapter implements EmailPort {
  async send(to: string, subject: string, body: string) {
    console.log('[email]', { to, subject, body })
  }
}

await orchestrator().start([
  register(Ports.email, { useFactory: () => new ConsoleEmail() })
])
```

## Resolve and use

```ts
import { container } from '@orkestrel/core'
await container().resolve(Ports.email).send('me@example.com', 'Hi', 'Welcome!')
```

## Shutdown

```ts
import { orchestrator } from '@orkestrel/core'
await orchestrator().destroy()
```

