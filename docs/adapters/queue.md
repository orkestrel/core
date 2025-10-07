# Queue (Port + Adapter)

A simple, strictly-typed in-memory FIFO queue and task runner with optional concurrency, per-task timeouts, shared deadlines, and abort signaling.

## Purpose
- Provide a minimal FIFO queue (enqueue/dequeue/size) for local workflows.
- Run arrays of async tasks with a configurable concurrency cap (or full parallelism).
- Preserve result order, abort scheduling on the first thrown error, and support time budgets.

## Contract
- Port: `QueuePort<T = unknown>`
  - `enqueue(item: T): Promise<void>`
  - `dequeue(): Promise<T | undefined>`
  - `size(): Promise<number>`
  - `run<R>(tasks: ReadonlyArray<() => Promise<R> | R>, options?: QueueRunOptions): Promise<ReadonlyArray<R>>`

- Options: `QueueRunOptions`
  - `concurrency?: number` — maximum number of tasks running at once; omit for full parallelism; use `1` for strict sequential execution.
  - `timeout?: number` — per-task timeout in milliseconds; when exceeded, that task rejects with a timeout error.
  - `deadline?: number` — shared time budget in milliseconds for the entire run; when exceeded, scheduling stops and the run rejects.
  - `signal?: AbortSignal` — aborts further scheduling when triggered; ongoing tasks continue and the run rejects.

- Adapter defaults: `QueueAdapterOptions extends QueueRunOptions`
  - `capacity?: number` — optional capacity guard for FIFO queue methods.
  - You can pass `concurrency`, `timeout`, `deadline`, and/or `signal` to the adapter constructor as defaults; per-call options override these.

## Default adapter
- `QueueAdapter<T = unknown>`
  - Preserves result order from the input `tasks` array.
  - Bounded concurrency per `options.concurrency` (defaults to full parallelism when omitted).
  - Aborts scheduling on first thrown error and rejects with that error.
  - Supports per-task `timeout`, shared `deadline`, and `AbortSignal` via `run()` options or constructor defaults.
  - Optional capacity for FIFO queue methods (`enqueue`/`dequeue`).

## Usage
```ts
import { QueueAdapter } from '@orkestrel/core'

// FIFO queue
const q = new QueueAdapter<number>({ capacity: 2 })
await q.enqueue(1)
await q.enqueue(2)
console.log(await q.dequeue()) // 1
console.log(await q.dequeue()) // 2

// Full parallelism (default): order preserved even if task durations differ
const parallel = await new QueueAdapter().run([
  async () => { await delay(10); return 'a' },
  async () => { await delay(5);  return 'b' },
  async () => { await delay(1);  return 'c' },
])
// ['a', 'b', 'c']

// Sequential: concurrency = 1
const seq = await new QueueAdapter().run([
  async () => step('first'),
  async () => step('second'),
], { concurrency: 1 })

// Bounded concurrency with per-task timeout
await new QueueAdapter().run([
  async () => { await delay(30); return 'slow' },
  async () => { await delay(5);  return 'fast' },
], { concurrency: 2, timeout: 10 })
// rejects with a timeout error

// Shared deadline (time budget across the entire run)
await new QueueAdapter().run([
  async () => { await delay(10); return 1 },
  async () => { await delay(10); return 2 },
  async () => { await delay(10); return 3 },
], { concurrency: 1, deadline: 15 })
// rejects: shared deadline exceeded

// Abort with AbortController
const ac = new AbortController()
const p = new QueueAdapter().run([
  async () => doWork(50),
  async () => doWork(50),
  async () => doWork(50),
], { concurrency: 2, signal: ac.signal })
setTimeout(() => ac.abort(), 10)
await p // rejects with an abort error

// Constructor defaults (override per-call): sequential + 200ms shared deadline
const runner = new QueueAdapter({ concurrency: 1, deadline: 200 })
await runner.run([taskA, taskB]) // uses defaults
await runner.run([taskC, taskD], { timeout: 50 }) // overrides per-call
```

## Behavior and guarantees
- Order-preserving: output positions mirror the input `tasks` indices.
- Errors: when any task throws/rejects, the run rejects and stops scheduling new tasks; already-running tasks are allowed to settle.
- Time budgets: for each task, the effective cap is `min(timeout, remainingDeadline)`; if either is zero at scheduling time, the task times out immediately.
- Abort: when aborted, no further tasks are scheduled; ongoing tasks are not preempted (standard JS constraints) and the run rejects.

## Where it’s used
- Orchestrator uses `QueueAdapter.run` to limit per-layer parallelism while preserving order and aggregating results.
- Lifecycle uses `QueueAdapter.run({ concurrency: 1, deadline: timeouts })` internally to run the primary hook and `onTransition` under a single shared time budget and then emits transition/hook events.

## Notes
- For `enqueue`, if `capacity` is set and exceeded, the promise rejects with `Error('QueueAdapter: capacity exceeded')`.
- There’s no persistence or retries built in; wrap tasks as needed for your use-case.