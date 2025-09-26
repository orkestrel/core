import { createPortTokens } from '@orkestrel/core'

// Define the application ports (interfaces) for the large example
export interface LoggerPort {
	info(msg: string, meta?: Record<string, unknown>): void
	warn(msg: string, meta?: Record<string, unknown>): void
	error(msg: string, meta?: Record<string, unknown>): void
}

export interface EmailPort {
	send(to: string, subject: string, body: string): Promise<void>
}

export interface UserServicePort {
	createUser(email: string, name: string): Promise<void>
}

export const Ports = createPortTokens({
	logger: {} as LoggerPort,
	email: {} as EmailPort,
	userService: {} as UserServicePort,
})

export type AppPorts = typeof Ports
