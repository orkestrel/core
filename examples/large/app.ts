import { Container, Orchestrator, Lifecycle, container, orchestrator, type Container as IContainer, type OrchestratorRegistration } from '@orkestrel/core'
import { Ports, type LoggerPort, type EmailPort } from './infra/ports.js'
import { userRegistrations, createDemoUser } from './modules/user.js'

// Simple console logger implementation
class ConsoleLogger implements LoggerPort {
	info(msg: string, meta?: Record<string, unknown>): void { console.log(`[info] ${msg}`, meta ?? '') }
	warn(msg: string, meta?: Record<string, unknown>): void { console.warn(`[warn] ${msg}`, meta ?? '') }
	error(msg: string, meta?: Record<string, unknown>): void { console.error(`[error] ${msg}`, meta ?? '') }
}

// Email service with lifecycle to demonstrate orchestrator start/stop/destroy
class ConsoleEmail extends Lifecycle implements EmailPort {
	private readonly logger: LoggerPort
	constructor(logger: LoggerPort) {
		super()
		this.logger = logger
	}

	protected async onStart(): Promise<void> { this.logger.info('ConsoleEmail started') }
	protected async onStop(): Promise<void> { this.logger.info('ConsoleEmail stopped') }
	protected async onDestroy(): Promise<void> { this.logger.info('ConsoleEmail destroyed') }
	async send(to: string, subject: string, body: string): Promise<void> {
		this.logger.info('Sending email', { to, subject })
		console.log('[email]', { to, subject, body })
	}
}

// App entry — set up default helpers and wire modules
const c = new Container()
container.set(c)
const app = new Orchestrator(c)
orchestrator.set(app)

// Prefer start([...]) at the app entry: declare infra + module registrations
const infra: OrchestratorRegistration<unknown>[] = [
	{ token: Ports.logger, provider: { useFactory: () => new ConsoleLogger() } },
	{ token: Ports.email, provider: { useFactory: (c: IContainer) => new ConsoleEmail(c.get(Ports.logger)) }, dependencies: [Ports.logger] },
]

const regs = [...infra, ...userRegistrations()]

// Compose, run a small flow, and clean up
await orchestrator().start(regs)
try {
	await createDemoUser(t => container().get(t))
}
finally {
	await orchestrator().stopAll()
	await orchestrator().destroyAll()
}
