// Centralized diagnostics: codes, templates, and helpers (errors/messages only)
// Public API preserved. Focused on orchestrator/container/lifecycle error shaping.

import type {
	OrkCode,
	DiagnosticInfo,
	LifecycleErrorDetail,
	LifecyclePhase,
	LifecycleHook,
	LifecycleContext,
	LifecycleState,
	DiagnosticMessage,
} from './types.js'

// -----------------------------------
// Formatting helpers and documentation links
// -----------------------------------

export function formatMessage(code: OrkCode, message: string): string {
	return `[Orkestrel][${code}] ${message}`
}

export function makeError(code: OrkCode, message: string, helpUrl?: string): Error {
	const err = new Error(formatMessage(code, message)) as Error & { code?: OrkCode, helpUrl?: string }
	err.code = code
	if (helpUrl) err.helpUrl = helpUrl
	return err
}

export const HELP = {
	registry: 'https://github.com/orkestrel/core/blob/main/docs/api.md#registry',
	container: 'https://github.com/orkestrel/core/blob/main/docs/start.md#container',
	providers: 'https://github.com/orkestrel/core/blob/main/docs/start.md#register-and-resolve',
	orchestrator: 'https://github.com/orkestrel/core/blob/main/docs/overview.md#orchestrator',
	errors: 'https://github.com/orkestrel/core/blob/main/docs/tips.md#troubleshooting',
	lifecycle: 'https://github.com/orkestrel/core/blob/main/docs/api.md#lifecycle',
} as const

// Helper to format token symbols consistently
export function tokenDescription(token: symbol): string {
	return token.description ?? String(token)
}

// Small internal helper to standardize aggregate info creation
function aggregateInfo(code: OrkCode, label: string): DiagnosticInfo {
	return { code, message: formatMessage(code, label), helpUrl: HELP.errors }
}

// -----------------------------------
// Error factories used across the codebase
// -----------------------------------

export const D = {
	// Registry
	registryNoDefault: (label: string) => makeError('ORK1001', `No ${label} instance registered for '<default>'`, HELP.registry),
	registryNoNamed: (label: string, key: string) => makeError('ORK1002', `No ${label} instance registered for '${key}'`, HELP.registry),
	registryCannotReplaceDefault: (label: string) => makeError('ORK1003', `Cannot replace default ${label} instance`, HELP.registry),
	registryCannotReplaceLocked: (label: string, key: string) => makeError('ORK1004', `Cannot replace locked ${label} instance for '${key}'`, HELP.registry),

	// Container
	containerDestroyed: () => makeError('ORK1005', 'Container already destroyed', HELP.container),
	containerNoProvider: (tokenDesc: string) => makeError('ORK1006', `No provider for ${tokenDesc}`, HELP.providers),

	// Orchestrator
	duplicateRegistration: (tokenDesc: string) => makeError('ORK1007', `Duplicate registration for ${tokenDesc}`, HELP.orchestrator),
	unknownDependency: (depDesc: string, tokenDesc: string) => makeError('ORK1008', `Unknown dependency ${depDesc} required by ${tokenDesc}`, HELP.orchestrator),
	cycleDetected: () => makeError('ORK1009', 'Cycle detected in dependencies', HELP.orchestrator),

	// Provider guards
	asyncUseValuePromise: (tokenDesc: string) => makeError('ORK1010', `Async providers are not supported: token '${tokenDesc}' was registered with useValue that is a Promise. Move async work into Lifecycle.onStart or pre-resolve the value before registration.`, HELP.providers),
	asyncUseFactoryAsync: (tokenDesc: string) => makeError('ORK1011', `Async providers are not supported: useFactory for token '${tokenDesc}' is an async function. Factories must be synchronous. Move async work into Lifecycle.onStart or pre-resolve the value.`, HELP.providers),
	asyncUseFactoryPromise: (tokenDesc: string) => makeError('ORK1012', `Async providers are not supported: useFactory for token '${tokenDesc}' returned a Promise. Factories must be synchronous. Move async work into Lifecycle.onStart or pre-resolve the value.`, HELP.providers),

	// Aggregation info
	startAggregate: (): DiagnosticInfo => aggregateInfo('ORK1013', 'Errors during start'),
	stopAggregate: (): DiagnosticInfo => aggregateInfo('ORK1014', 'Errors during stop'),
	containerDestroyAggregate: (): DiagnosticInfo => aggregateInfo('ORK1016', 'Errors during container destroy'),
	destroyAggregate: (): DiagnosticInfo => aggregateInfo('ORK1017', 'Errors during destroy'),

	// Internal invariants
	invariantMissingNode: () => makeError('ORK1099', 'Invariant: missing node entry'),

	// Lifecycle diagnostics
	invalidTransition: (from: LifecycleState, to: LifecycleState) => makeError('ORK1020', `Invalid lifecycle transition from '${from}' to '${to}'`, HELP.lifecycle),
	hookTimeout: (hook: LifecycleHook, ms: number) => makeError('ORK1021', `Lifecycle hook '${hook}' timed out after ${ms}ms`, HELP.lifecycle),

	// Detail factory to keep uniform shape across callers
	makeDetail: (
		tokenDescription: string,
		phase: LifecyclePhase,
		context: LifecycleContext,
		res: { durationMs: number, error: Error, timedOut?: boolean },
	): LifecycleErrorDetail => ({
		tokenDescription,
		phase,
		context,
		timedOut: res.timedOut ?? false,
		durationMs: res.durationMs,
		error: res.error,
	}),
} as const

// -----------------------------------
// Error classes consolidated under diagnostics
// -----------------------------------

export class LifecycleError extends Error {
	public readonly cause?: unknown
	constructor(message: string, options?: { cause?: unknown }) {
		super(message)
		this.name = 'LifecycleError'
		if (options && 'cause' in options) (this as unknown as { cause?: unknown }).cause = options.cause
		Object.setPrototypeOf(this, new.target.prototype)
	}
}

export class InvalidTransitionError extends LifecycleError {
	constructor(public readonly from: LifecycleState, public readonly to: LifecycleState) {
		const base = D.invalidTransition(from, to) as Error & { code?: OrkCode, helpUrl?: string }
		super(base.message)
		this.name = 'InvalidTransitionError'
	}
}

export class TimeoutError extends LifecycleError {
	constructor(public readonly hook: LifecycleHook, public readonly ms: number) {
		const base = D.hookTimeout(hook, ms) as Error & { code?: OrkCode, helpUrl?: string }
		super(base.message)
		this.name = 'TimeoutError'
	}
}

export class AggregateLifecycleError extends LifecycleError {
	public readonly errors: Error[]
	public readonly details: LifecycleErrorDetail[]
	public readonly code?: OrkCode
	public readonly helpUrl?: string
	constructor(info: { code?: OrkCode, message: string, helpUrl?: string } | DiagnosticInfo, detailsOrErrors: LifecycleErrorDetail[] | Error[]) {
		const details: LifecycleErrorDetail[] = detailsOrErrors.map((e: LifecycleErrorDetail | Error): LifecycleErrorDetail => {
			if (e instanceof Error) {
				return { tokenDescription: 'unknown', phase: 'start', context: 'normal', timedOut: false, durationMs: 0, error: e }
			}
			return e
		})
		super(info.message, { cause: details[0]?.error })
		this.name = 'AggregateLifecycleError'
		this.details = details
		this.errors = details.map(d => d.error)
		this.code = (info as DiagnosticInfo).code
		this.helpUrl = (info as DiagnosticInfo).helpUrl
	}
}

// -----------------------------------
// Default messages for DiagnosticsAdapter mapping
// -----------------------------------

export const DIAGNOSTIC_MESSAGES: ReadonlyArray<DiagnosticMessage> = Object.freeze([
	// Lifecycle
	{ key: 'lifecycle.transition', level: 'debug', message: 'lifecycle.transition' },
	{ key: 'lifecycle.hook', level: 'info', message: 'lifecycle.hook' },
	// Orchestrator component lifecycle
	{ key: 'orchestrator.component.start', level: 'info', message: 'orchestrator.component.start' },
	{ key: 'orchestrator.component.stop', level: 'info', message: 'orchestrator.component.stop' },
	{ key: 'orchestrator.component.destroy', level: 'info', message: 'orchestrator.component.destroy' },
	// Aggregate error codes
	{ key: 'ORK1013', level: 'error', message: 'Errors during start' },
	{ key: 'ORK1014', level: 'error', message: 'Errors during stop' },
	{ key: 'ORK1016', level: 'error', message: 'Errors during container destroy' },
	{ key: 'ORK1017', level: 'error', message: 'Errors during destroy' },
])
