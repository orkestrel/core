import type { DiagnosticMessage } from './types.js'

/**
 * Predefined diagnostic message maps used across the core package.
 *
 * These message groups can be passed to DiagnosticAdapter to emit consistent
 * log levels, messages, and codes. You can also provide your own overrides
 * by merging with these defaults.
 *
 * @example
 * ```ts
 * import { DiagnosticAdapter } from './adapters/diagnostic.js'
 * import { ORCHESTRATOR_MESSAGES, LIFECYCLE_MESSAGES } from './constants.js'
 *
 * const diag = new DiagnosticAdapter({
 *   messages: [
 *     ...ORCHESTRATOR_MESSAGES,
 *     ...LIFECYCLE_MESSAGES,
 *     { key: 'my.metric', level: 'debug', message: 'metric:custom' },
 *   ],
 * })
 * ```
 */

/** Default lifecycle diagnostic messages and codes used by Lifecycle/Queue. */
export const LIFECYCLE_MESSAGES: ReadonlyArray<DiagnosticMessage> = Object.freeze([
	{ key: 'lifecycle.transition', level: 'debug', message: 'lifecycle.transition' },
	{ key: 'lifecycle.hook', level: 'info', message: 'lifecycle.hook' },
	{ key: 'ORK1020', level: 'error', message: 'Lifecycle: invalid transition' },
	{ key: 'ORK1021', level: 'error', message: 'Lifecycle: hook timed out' },
	{ key: 'ORK1022', level: 'error', message: 'Lifecycle: hook failed' },
])

/** Orchestrator diagnostic messages and codes. */
export const ORCHESTRATOR_MESSAGES: ReadonlyArray<DiagnosticMessage> = Object.freeze([
	{ key: 'orchestrator.component.start', level: 'info', message: 'orchestrator.component.start' },
	{ key: 'orchestrator.component.stop', level: 'info', message: 'orchestrator.component.stop' },
	{ key: 'orchestrator.component.destroy', level: 'info', message: 'orchestrator.component.destroy' },
	{ key: 'orchestrator.phase', level: 'info', message: 'orchestrator.phase' },
	{ key: 'orchestrator.layers', level: 'debug', message: 'orchestrator.layers' },
	{ key: 'ORK1007', level: 'error', message: 'Orchestrator: duplicate registration' },
	{ key: 'ORK1008', level: 'error', message: 'Orchestrator: unknown dependency' },
	{ key: 'ORK1009', level: 'error', message: 'Orchestrator: cycle detected' },
	{ key: 'ORK1010', level: 'error', message: 'Orchestrator: async useValue' },
	{ key: 'ORK1011', level: 'error', message: 'Orchestrator: async useFactory (async function)' },
	{ key: 'ORK1012', level: 'error', message: 'Orchestrator: async useFactory (returned Promise)' },
	{ key: 'ORK1013', level: 'error', message: 'Errors during start' },
	{ key: 'ORK1014', level: 'error', message: 'Errors during stop' },
	{ key: 'ORK1015', level: 'error', message: 'Errors during destroyAll' },
	{ key: 'ORK1017', level: 'error', message: 'Errors during destroy' },
])

/** Container diagnostic messages and codes. */
export const CONTAINER_MESSAGES: ReadonlyArray<DiagnosticMessage> = Object.freeze([
	{ key: 'ORK1005', level: 'error', message: 'Container: already destroyed' },
	{ key: 'ORK1006', level: 'error', message: 'Container: no provider for token' },
	{ key: 'ORK1016', level: 'error', message: 'Errors during container destroy' },
])

/** Registry diagnostic messages and codes. */
export const REGISTRY_MESSAGES: ReadonlyArray<DiagnosticMessage> = Object.freeze([
	{ key: 'ORK1001', level: 'error', message: 'Registry: no default instance' },
	{ key: 'ORK1002', level: 'error', message: 'Registry: no named instance' },
	{ key: 'ORK1003', level: 'error', message: 'Registry: cannot replace default' },
	{ key: 'ORK1004', level: 'error', message: 'Registry: cannot replace locked' },
])

/** Port helper diagnostics and codes. */
export const PORTS_MESSAGES: ReadonlyArray<DiagnosticMessage> = Object.freeze([
	{ key: 'ORK1040', level: 'error', message: 'Ports: duplicate key' },
])

/** Queue diagnostic messages and codes. */
export const QUEUE_MESSAGES: ReadonlyArray<DiagnosticMessage> = Object.freeze([
	{ key: 'ORK1050', level: 'error', message: 'Queue: capacity exceeded' },
	{ key: 'ORK1051', level: 'error', message: 'Queue: aborted' },
	{ key: 'ORK1052', level: 'error', message: 'Queue: task timed out' },
	{ key: 'ORK1053', level: 'error', message: 'Queue: shared deadline exceeded' },
])

/** Internal invariant diagnostic codes. */
export const INTERNAL_MESSAGES: ReadonlyArray<DiagnosticMessage> = Object.freeze([
	{ key: 'ORK1099', level: 'error', message: 'Internal invariant' },
])

/**
 * Links to documentation sections used in error messages for help.
 * Consumers may display these URLs when rendering errors.
 */
export const HELP = {
	registry: 'https://github.com/orkestrel/core/blob/main/api/index.html#registry',
	container: 'https://github.com/orkestrel/core/blob/main/api/index.html#container',
	providers: 'https://github.com/orkestrel/core/blob/main/api/index.html#register-and-resolve',
	orchestrator: 'https://github.com/orkestrel/core/blob/main/api/index.html#orchestrator',
	errors: 'https://github.com/orkestrel/core/blob/main/api/index.html#troubleshooting',
	lifecycle: 'https://github.com/orkestrel/core/blob/main/api/index.html#lifecycle',
} as const
