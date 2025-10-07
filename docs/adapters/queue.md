# Queue (Port + Adapter)

A simple in-memory FIFO queue and task runner with optional concurrency limiting.

## Purpose
- Provide a minimal FIFO queue (enqueue/dequeue/size) for local workflows.
- Run arrays of async tasks with a configurable concurrency cap.
- Preserve result order and abort on the first task error.

## Contract
- Port: QueuePort<T>
  - enqueue(item: T): Promise<void>
  - dequeue(): Promise<T | undefined>
  - size(): Promise<number>
  - run<R>(tasks: ReadonlyArray<() => Promise<R> | R>, options?: { concurrency?: number }): Promise<ReadonlyArray<R>>

## Default adapter
- QueueAdapter
  - Preserves result order from the input `tasks` array
  - Bounded concurrency per `options.concurrency` (defaults to full parallelism)
  - Aborts on first task error and rejects with that error
  - Optional capacity for FIFO queue methods (enqueue/dequeue)

## Usage
```ts
import { QueueAdapter } from '@orkestrel/core'

// FIFO queue
const q = new QueueAdapter<number>()
await q.enqueue(1)
await q.enqueue(2)
console.log(await q.dequeue()) // 1
console.log(await q.dequeue()) // 2

// Run bounded-concurrency tasks (order preserved)
const results = await new QueueAdapter().run([
  async () => 'a',
  async () => 'b',
  async () => 'c',
], { concurrency: 2 })
// results: ['a', 'b', 'c']
```

## Notes
- The Orchestrator composes bounded concurrency using QueueAdapter under the hood for per-layer start/stop/destroy.
- For `enqueue`, if capacity is set (e.g., `{ capacity: 2 }`) and exceeded, the promise rejects with `Error('QueueAdapter: capacity exceeded')`.
- No persistence or retries built in; wrap tasks as needed for your use-case.
