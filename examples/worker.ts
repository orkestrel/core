import { Adapter, Container, Orchestrator, createToken, register } from '@orkestrel/core'

// Minimal tokens for the example
interface Logger { info(msg: string, meta?: Record<string, unknown>): void, error(msg: string, meta?: Record<string, unknown>): void }
interface WorkerConfig { intervalMs: number }

const TLogger = createToken<Logger>('example:worker:logger')
const TConfig = createToken<WorkerConfig>('example:worker:config')
const TWorker = createToken<WorkerLoop>('example:worker:loop')

class ConsoleLogger implements Logger {
	info(msg: string, meta?: Record<string, unknown>) { console.log(`[worker][info] ${msg}`, meta ?? '') }
	error(msg: string, meta?: Record<string, unknown>) { console.error(`[worker][error] ${msg}`, meta ?? '') }
}

// A simple worker loop adapter
class WorkerLoop extends Adapter {
	private readonly logger: Logger
	private readonly intervalMs: number
	private timer?: ReturnType<typeof setInterval>
	private ticks = 0

	constructor(logger: Logger, cfg: WorkerConfig) {
		super()
		this.logger = logger
		this.intervalMs = cfg.intervalMs
	}

	protected async onStart(): Promise<void> {
		this.logger.info('worker starting', { intervalMs: this.intervalMs })
		this.timer = setInterval(() => {
			this.ticks++
			this.logger.info('tick', { ticks: this.ticks })
		}, this.intervalMs)
	}

	protected async onStop(): Promise<void> {
		if (this.timer) clearInterval(this.timer)
		this.logger.info('worker stopped', { ticks: this.ticks })
	}
}

// Compose and run a brief worker session
const c = new Container()
const app = new Orchestrator(c)
await app.start([
	register(TLogger, { useClass: ConsoleLogger }),
	register(TConfig, { useValue: { intervalMs: 50 } }),
	register(
		TWorker,
		{ useClass: WorkerLoop, inject: [TLogger, TConfig] },
		{ dependencies: [TLogger, TConfig] },
	),
])

// Let it tick a few times then shut down
await new Promise(r => setTimeout(r, 250))
await app.destroy()
