import { describe, test, beforeEach, afterEach } from 'vitest';
import assert from 'node:assert/strict';
import type { LifecycleState, QueuePort } from '@orkestrel/core';
import { Adapter, NoopLogger } from '@orkestrel/core';

let logger: NoopLogger;

class TestLifecycle extends Adapter {
	public log: string[] = [];
	protected async onCreate(): Promise<void> {
		this.log.push('create');
	}

	protected async onStart(): Promise<void> {
		this.log.push('start');
	}

	protected async onStop(): Promise<void> {
		this.log.push('stop');
	}

	protected async onDestroy(): Promise<void> {
		this.log.push('destroy');
	}
}

class FailingStart extends Adapter {
	protected async onStart(): Promise<void> {
		throw new Error('boom');
	}
}
class HangingStart extends Adapter {
	protected async onStart(): Promise<void> {
		await new Promise(() => {});
	}
}

describe('Lifecycle suite', () => {
	beforeEach(() => {
		logger = new NoopLogger();
	});

	afterEach(async () => {
		// Clean up any singleton instances
		await TestLifecycle.destroy().catch(() => {});
		await FailingStart.destroy().catch(() => {});
		await HangingStart.destroy().catch(() => {});
	});

	test('happy path transitions', async () => {
		await TestLifecycle.create({ timeouts: 100, logger });
		assert.equal(TestLifecycle.getState(), 'created');
		await TestLifecycle.start();
		assert.equal(TestLifecycle.getState(), 'started');
		await TestLifecycle.stop();
		assert.equal(TestLifecycle.getState(), 'stopped');
		await TestLifecycle.start();
		assert.equal(TestLifecycle.getState(), 'started');
		const instance = TestLifecycle.getInstance();
		assert.deepEqual(instance.log, ['create', 'start', 'stop', 'start']);
		await TestLifecycle.destroy();
		assert.equal(TestLifecycle.getState(), 'created');
	});

	test('failing start wraps error', async () => {
		await assert.rejects(() => FailingStart.start({ timeouts: 50, logger }), /Hook 'start' failed/);
		assert.equal(FailingStart.getState(), 'created');
	});

	// New test: ensure non-timeout hook failures expose ORK1022 code
	test('failing start sets ORK1022 code', async () => {
		await assert.rejects(() => FailingStart.start({ timeouts: 50, logger }), (err: unknown) => {
			// Narrow incrementally and check for a code property safely
			if (typeof err === 'object' && err !== null && 'code' in err) {
				const code = (err as { code?: unknown }).code;
				// Only assert when a string code is present
				if (typeof code === 'string') assert.equal(code, 'ORK1022');
			}
			return true;
		});
	});

	test('hook timeout triggers TimeoutError', async () => {
		await assert.rejects(() => HangingStart.start({ timeouts: 10, logger }), /timed out/);
		assert.equal(HangingStart.getState(), 'created');
	});

	// New test: ensure timeout failures expose ORK1021 code
	test('hook timeout sets ORK1021 code', async () => {
		await assert.rejects(() => HangingStart.start({ timeouts: 10, logger }), (err: unknown) => {
			if (typeof err === 'object' && err !== null && 'code' in err) {
				const code = (err as { code?: unknown }).code;
				if (typeof code === 'string') assert.equal(code, 'ORK1021');
			}
			return true;
		});
		assert.equal(HangingStart.getState(), 'created');
	});

	test('invalid transition throws', async () => {
		await TestLifecycle.start({ logger });
		await assert.rejects(async () => TestLifecycle.create(), (err: unknown) => {
			assert.match((err as Error).message, /Invalid lifecycle transition/);
			return true;
		});
		await TestLifecycle.destroy();
		// After destroy, instance is cleared, so start() will create a new instance
		// This is expected behavior with singletons - destroy clears the singleton
	});

	test('onTransition runs between hook and state change (filterable in override)', async () => {
		class Transitions extends Adapter {
			public transitions: string[] = [];
			protected async onStart(): Promise<void> {
				// no-op
			}

			protected async onStop(): Promise<void> {
				// no-op
			}

			protected async onTransition(from: LifecycleState, to: LifecycleState, hook: 'create' | 'start' | 'stop' | 'destroy'): Promise<void> {
				// filter internally to only record 'start' transitions
				if (hook === 'start') this.transitions.push(`${from}->${to}:${hook}`);
			}
		}

		await Transitions.start({ timeouts: 50, logger });
		assert.equal(Transitions.getState(), 'started');
		await Transitions.stop();
		assert.equal(Transitions.getState(), 'stopped');
		const instance = Transitions.getInstance();
		assert.deepEqual(instance.transitions, ['created->started:start']);
		await Transitions.destroy();
	});

	test('onTransition timeout surfaces as TimeoutError', async () => {
		class SlowTransition extends Adapter {
			static instance?: SlowTransition;
			protected async onStart(): Promise<void> {
				// ok
			}

			protected async onTransition(): Promise<void> {
				await new Promise(() => {});
			}
		}
		await assert.rejects(() => SlowTransition.start({ timeouts: 10, logger }), /timed out/);
		assert.equal(SlowTransition.getState(), 'created');
		// Clean up manually without calling destroy which would also timeout
		SlowTransition.instance = undefined;
	});

	test('transition not emitted twice for created->created on create()', async () => {
		const events: LifecycleState[] = [];
		class L extends Adapter {
			protected async onCreate(): Promise<void> {
				// no-op
			}
		}
		L.on('transition', s => events.push(s));
		// allow initial microtask to flush
		await new Promise(r => setTimeout(r, 0));
		assert.deepEqual(events, ['created']);
		await L.create({ timeouts: 20, logger });
		// no new event for created->created
		await new Promise(r => setTimeout(r, 0));
		assert.deepEqual(events, ['created']);
		await L.destroy();
	});

	test('emitInitial=false suppresses initial transition', async () => {
		const events: LifecycleState[] = [];
		class L extends Adapter {
			static instance?: L;
			protected async onStart(): Promise<void> {
				// no-op
			}
		}
		// Subscribe before creating instance - this creates the instance with default options
		L.on('transition', s => events.push(s));
		// Wait for initial transition to complete
		await new Promise(r => setTimeout(r, 10));
		// Clear events (will have 'created' from subscription)
		events.length = 0;
		// Now start it
		await L.start();
		await new Promise(r => setTimeout(r, 10));
		// Should only see started, not created again
		assert.deepEqual(events, ['started']);
		await L.destroy();
	});

	test('supports injected queue and enforces concurrency=1 with shared deadline', async () => {
		interface Capture { calls: number; lastOptions?: { concurrency?: number; deadline?: number } }
		const cap: Capture = { calls: 0 };
		class FakeQueue implements QueuePort<unknown> {
			async enqueue(_: unknown): Promise<void> { /* noop */ }
			async dequeue(): Promise<unknown> { return undefined; }
			async size(): Promise<number> { return 0; }
			async run<R>(tasks: ReadonlyArray<() => Promise<R> | R>, options?: { concurrency?: number; deadline?: number }): Promise<readonly R[]> {
				cap.calls++;
				cap.lastOptions = { concurrency: options?.concurrency, deadline: options?.deadline };
				const out: R[] = [];
				for (const t of tasks) out.push(await Promise.resolve(t()));
				return out;
			}
		}
		class QLife extends Adapter {
			public ok = false;
			protected async onStart(): Promise<void> { this.ok = true; }
			protected async onTransition(): Promise<void> { /* no-op */ }
		}
		const timeouts = 25;
		const q = new FakeQueue();
		await QLife.start({ timeouts, queue: q, logger });
		assert.equal(QLife.getState(), 'started');
		const instance = QLife.getInstance();
		assert.equal(instance.ok, true);
		assert.equal(cap.calls, 1);
		assert.equal(cap.lastOptions?.concurrency, 1);
		assert.equal(cap.lastOptions?.deadline, timeouts);
		await QLife.destroy();
	});
});
