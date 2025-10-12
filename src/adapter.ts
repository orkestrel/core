import { Lifecycle } from './lifecycle.js'

/**
 * Base class for building adapters/components that participate in a deterministic lifecycle.
 *
 * Extends {@link Lifecycle} and exposes the same hook surface (override the protected onX methods).
 * You typically subclass Adapter, implement the hooks you need, and then register an instance with
 * a {@link Container} or {@link Orchestrator}.
 *
 * @example
 * ```ts
 * import { Adapter, createToken, Container } from '@orkestrel/core'
 *
 * // Define a component by subclassing Adapter and overriding hooks
 * class HttpServer extends Adapter {
 *   #server?: { listen: () => Promise<void>, close: () => Promise<void> }
 *   readonly #port: number
 *   constructor(port: number) { super(); this.#port = port }
 *   protected async onStart() {
 *     // create server; await server.listen()
 *     this.#server = undefined
 *   }
 *   protected async onStop() {
 *     // await this.#server?.close()
 *   }
 * }
 *
 * // Register and drive it via the container
 * const TOK = createToken<HttpServer>('http')
 * const container = new Container()
 * container.register(TOK, { useFactory: () => new HttpServer(3000) })
 * const srv = container.resolve(TOK)
 * await srv.start()
 * await srv.stop()
 * await container.destroy() // ensures srv is destroyed
 * ```
 *
 * @remarks
 * Override any of the protected hooks: onCreate, onStart, onStop, onDestroy, onTransition.
 */
export abstract class Adapter extends Lifecycle {
	// Optional hook invoked during create(); no-op by default.
	protected async onCreate(): Promise<void> {}
	// Optional hook invoked during start(); no-op by default.
	protected async onStart(): Promise<void> {}
	// Optional hook invoked during stop(); no-op by default.
	protected async onStop(): Promise<void> {}
	// Optional hook invoked during destroy(); no-op by default.
	protected async onDestroy(): Promise<void> {}
}
