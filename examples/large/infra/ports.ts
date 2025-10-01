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

export interface ClockPort { now(): Date }
export interface AppConfig { appName: string, supportEmail: string }

export const Ports = createPortTokens({
	logger: {} as LoggerPort,
	email: {} as EmailPort,
	userService: {} as UserServicePort,
	clock: {} as ClockPort,
	config: {} as AppConfig,
})

export type AppPorts = typeof Ports
