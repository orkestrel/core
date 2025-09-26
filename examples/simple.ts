import { Container, Orchestrator, createPortTokens, container, orchestrator } from '@orkestrel/core'

// Define a very small port shape
interface EmailPort { send(to: string, subject: string, body: string): Promise<void> }

const Ports = createPortTokens({ email: {} as EmailPort })

class ConsoleEmail implements EmailPort {
	async send(to: string, subject: string, body: string): Promise<void> {
		console.log('[email]', { to, subject, body })
	}
}

// Set default instances using helpers
const c = new Container()
container.set(c)
const app = new Orchestrator(c)
orchestrator.set(app)

// Register and start
await orchestrator().start([
	{ token: Ports.email, provider: { useFactory: () => new ConsoleEmail() } },
])

// Use the container to resolve and call a port
const email = container().get(Ports.email)
await email.send('me@example.com', 'Hello', 'Welcome to Orkestrel')

// Clean up
await orchestrator().stopAll()
await orchestrator().destroyAll()
