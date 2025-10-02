import { Adapter, Container, Orchestrator, createToken, register } from '@orkestrel/core'
import http from 'node:http'

// Minimal tokens for the example
interface Logger { info(msg: string, meta?: Record<string, unknown>): void, error(msg: string, meta?: Record<string, unknown>): void }
interface WebConfig { port: number }

const TLogger = createToken<Logger>('example:web:logger')
const TConfig = createToken<WebConfig>('example:web:config')
const TServer = createToken<WebServer>('example:web:server')

class ConsoleLogger implements Logger {
	info(msg: string, meta?: Record<string, unknown>) { console.log(`[web][info] ${msg}`, meta ?? '') }
	error(msg: string, meta?: Record<string, unknown>) { console.error(`[web][error] ${msg}`, meta ?? '') }
}

// A tiny HTTP server wrapped in a Lifecycle adapter
class WebServer extends Adapter {
	private readonly logger: Logger
	private readonly port: number
	private server?: http.Server

	constructor(logger: Logger, cfg: WebConfig) {
		super()
		this.logger = logger
		this.port = cfg.port
	}

	protected async onStart(): Promise<void> {
		this.server = http.createServer((_req, res) => {
			res.writeHead(200, { 'Content-Type': 'application/json' })
			res.end(JSON.stringify({ ok: true, ts: Date.now() }))
		})
		await new Promise<void>((resolve, reject) => {
			this.server!.listen(this.port).once('listening', () => resolve()).once('error', reject)
		})
		const addr = this.server!.address()
		const port = typeof addr === 'object' && addr ? addr.port : this.port
		this.logger.info('web server started', { port })
	}

	protected async onStop(): Promise<void> {
		if (!this.server) return
		await new Promise<void>(resolve => this.server!.close(() => resolve()))
		this.logger.info('web server stopped')
	}
}

// Compose and run a tiny smoke flow
const c = new Container()
const app = new Orchestrator(c)
await app.start([
	register(TLogger, { useClass: ConsoleLogger }),
	register(TConfig, { useValue: { port: 3000 } }),
	register(
		TServer,
		{ useFactory: (c: Container) => new WebServer(c.resolve(TLogger), c.resolve(TConfig)) },
		{ dependencies: [TLogger, TConfig] },
	),
])

// do a small wait to simulate work, then clean up
await new Promise(r => setTimeout(r, 200))
await app.destroy()
