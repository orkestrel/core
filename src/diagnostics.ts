// Centralized default message mappings for DiagnosticAdapter
// Diagnostic messages and HELP links only; error creation/throwing is centralized in DiagnosticAdapter.

import type { DiagnosticMessage } from './types.js'

export const DIAGNOSTIC_MESSAGES: ReadonlyArray<DiagnosticMessage> = Object.freeze([
	// Lifecycle
	{ key: 'lifecycle.transition', level: 'debug', message: 'lifecycle.transition' },
	{ key: 'lifecycle.hook', level: 'info', message: 'lifecycle.hook' },
	// Orchestrator component lifecycle
	{ key: 'orchestrator.component.start', level: 'info', message: 'orchestrator.component.start' },
	{ key: 'orchestrator.component.stop', level: 'info', message: 'orchestrator.component.stop' },
	{ key: 'orchestrator.component.destroy', level: 'info', message: 'orchestrator.component.destroy' },
	// Orchestrator tracing/events
	{ key: 'orchestrator.phase', level: 'info', message: 'orchestrator.phase' },
	{ key: 'orchestrator.layers', level: 'debug', message: 'orchestrator.layers' },

	// Registry errors
	{ key: 'ORK1001', level: 'error', message: 'Registry: no default instance' },
	{ key: 'ORK1002', level: 'error', message: 'Registry: no named instance' },
	{ key: 'ORK1003', level: 'error', message: 'Registry: cannot replace default' },
	{ key: 'ORK1004', level: 'error', message: 'Registry: cannot replace locked' },

	// Container errors
	{ key: 'ORK1005', level: 'error', message: 'Container: already destroyed' },
	{ key: 'ORK1006', level: 'error', message: 'Container: no provider for token' },
	{ key: 'ORK1016', level: 'error', message: 'Errors during container destroy' },

	// Orchestrator errors
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

	// Lifecycle errors
	{ key: 'ORK1020', level: 'error', message: 'Lifecycle: invalid transition' },
	{ key: 'ORK1021', level: 'error', message: 'Lifecycle: hook timed out' },
	{ key: 'ORK1022', level: 'error', message: 'Lifecycle: hook failed' },

	// Ports & Queue
	{ key: 'ORK1040', level: 'error', message: 'Ports: duplicate key' },
	{ key: 'ORK1050', level: 'error', message: 'Queue: capacity exceeded' },
	{ key: 'ORK1051', level: 'error', message: 'Queue: aborted' },
	{ key: 'ORK1052', level: 'error', message: 'Queue: task timed out' },
	{ key: 'ORK1053', level: 'error', message: 'Queue: shared deadline exceeded' },

	// Internal
	{ key: 'ORK1099', level: 'error', message: 'Internal invariant' },
])

// Centralized HELP links for documentation
export const HELP = {
	registry: 'https://github.com/orkestrel/core/blob/main/docs/api.md#registry',
	container: 'https://github.com/orkestrel/core/blob/main/docs/start.md#container',
	providers: 'https://github.com/orkestrel/core/blob/main/docs/start.md#register-and-resolve',
	orchestrator: 'https://github.com/orkestrel/core/blob/main/docs/overview.md#orchestrator',
	errors: 'https://github.com/orkestrel/core/blob/main/docs/tips.md#troubleshooting',
	lifecycle: 'https://github.com/orkestrel/core/blob/main/docs/api.md#lifecycle',
} as const
