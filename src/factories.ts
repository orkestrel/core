import type { Token } from './types.js'

/**
 * Create a unique Token (a branded `symbol`) with a human‑friendly description.
 *
 * @typeParam T - The value type carried by the token (typing only)
 * @param description - The symbol description shown in diagnostics and logs
 * @returns A new unique token symbol
 * @example
 * ```ts
 * const HttpPort = createToken<{ get(url: string): Promise<string> }>('http')
 * ```
 */
export function createToken<T = unknown>(description: string): Token<T> {
	return Symbol(description)
}

// TODO: [Phase 3] Add factory functions for Container, Orchestrator, etc.
// These will be implemented in Phase 3 when the core implementations are refactored

// Future factory function stubs:
// export function createContainer(options?: ContainerOptions): ContainerInterface
// export function createOrchestrator(options?: OrchestratorOptions): OrchestratorInterface
// export function createEmitter<EMap extends EventMap>(options?: EmitterAdapterOptions): EmitterInterface<EMap>
// export function createQueue<T>(options?: QueueAdapterOptions): QueueInterface<T>
// export function createRegistry<T>(options?: RegistryAdapterOptions<T>): RegistryInterface<T>
