import { createPortTokens, container, orchestrator } from '@orkestrel/core'

// Define a very small port shape
interface EmailPort { send(to: string, subject: string, body: string): Promise<void> }

const Ports = createPortTokens({ email: {} as EmailPort })

class ConsoleEmail implements EmailPort {
	async send(to: string, subject: string, body: string): Promise<void> {
		console.log('[email]', { to, subject, body })
	}
}

// Register and start using the default orchestrator
await orchestrator().start([
	{ token: Ports.email, provider: { useFactory: () => new ConsoleEmail() } },
])

// Use the default container to resolve and call a port
const email = container().resolve(Ports.email)
await email.send('me@example.com', 'Hello', 'Welcome to Orkestrel')

// Clean up
await orchestrator().destroy()
