import type { OrchestratorRegistration, Container } from '@orkestrel/core'
import { type EmailPort, type LoggerPort, type UserServicePort, Ports } from '../infra/ports.js'

class DefaultUserService implements UserServicePort {
	private readonly email: EmailPort
	private readonly logger: LoggerPort
	constructor(email: EmailPort, logger: LoggerPort) {
		this.email = email
		this.logger = logger
	}

	async createUser(email: string, name: string): Promise<void> {
		this.logger.info('Creating user', { email, name })
		await this.email.send(email, 'Welcome!', `Hi ${name}, welcome aboard!`)
		this.logger.info('User created', { email })
	}
}

export function userRegistrations(): OrchestratorRegistration<unknown>[] {
	return [
		{
			token: Ports.userService,
			provider: { useFactory: (c: Container) => new DefaultUserService(c.resolve(Ports.email), c.resolve(Ports.logger)) },
			dependencies: [Ports.email, Ports.logger],
		},
	]
}

export async function createDemoUser(resolve: (t: typeof Ports.userService) => UserServicePort): Promise<void> {
	const svc = resolve(Ports.userService)
	await svc.createUser('jane@example.com', 'Jane Doe')
}
