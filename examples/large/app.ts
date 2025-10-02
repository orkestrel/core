import { Lifecycle, container, orchestrator, type OrchestratorRegistration } from '@orkestrel/core'
import { Ports, type LoggerPort, type EmailPort, type ClockPort, type AppConfig } from './infra/ports.js'
import { userRegistrations, createDemoUser } from './modules/user.js'

// Simple console logger implementation
class ConsoleLogger implements LoggerPort {
	info(msg: string, meta?: Record<string, unknown>): void { console.log(`[info] ${msg}`, meta ?? '') }
	warn(msg: string, meta?: Record<string, unknown>): void { console.warn(`[warn] ${msg}`, meta ?? '') }
	error(msg: string, meta?: Record<string, unknown>): void { console.error(`[error] ${msg}`, meta ?? '') }
}

// Clock implementation
class SystemClock implements ClockPort {
	now(): Date {
		return new Date()
	}
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

// Prefer start([...]) at the app entry: declare infra + module registrations
const infra: OrchestratorRegistration<unknown>[] = [
	{ token: Ports.config, provider: { useValue: { appName: 'Acme', supportEmail: 'support@acme.test' } satisfies AppConfig } },
	{ token: Ports.clock, provider: { useClass: SystemClock } },
	{ token: Ports.logger, provider: { useClass: ConsoleLogger } },
	{ token: Ports.email, provider: { useClass: ConsoleEmail, inject: [Ports.logger] }, dependencies: [Ports.logger] },
]

const regs = [...infra, ...userRegistrations()]

// Compose, run a small flow, and clean up
await orchestrator().start(regs)
try {
	// Resolve a map of tokens at once via the callable container helper
	const { clock, logger, config } = container().resolve({
		clock: Ports.clock,
		logger: Ports.logger,
		config: Ports.config,
	})
	logger.info('Boot complete', { app: config.appName, startedAt: clock.now().toISOString() })

	await createDemoUser(t => container().resolve(t))
}
finally {
	await orchestrator().destroy()
}
