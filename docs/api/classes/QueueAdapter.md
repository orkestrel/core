[**@orkestrel/core**](../index.md)

***

# Class: QueueAdapter\<T\>

Defined in: [adapters/queue.ts:25](https://github.com/orkestrel/core/blob/36bb4ac962a6eb83d3b3b7e1d15ed7b2fd751427/src/adapters/queue.ts#L25)

In-memory task queue with concurrency control, timeouts, and shared deadlines.

Provides a FIFO queue for items and a task runner that can execute tasks with configurable
concurrency limits, per-task timeouts, and shared deadlines. Supports abort signals for
cancellation and preserves result order regardless of completion timing.

## Example

```ts
import { QueueAdapter } from '@orkestrel/core'
const queue = new QueueAdapter({ concurrency: 2, timeout: 1000 })
const results = await queue.run([
  async () => { await delay(100); return 1 },
  async () => { await delay(50); return 2 },
  async () => { await delay(200); return 3 },
])
console.log(results) // => [1, 2, 3] (order preserved)
```

## Type Parameters

### T

`T` = `unknown`

## Implements

- [`QueuePort`](../interfaces/QueuePort.md)\<`T`\>

## Constructors

### Constructor

> **new QueueAdapter**\<`T`\>(`options`): `QueueAdapter`\<`T`\>

Defined in: [adapters/queue.ts:45](https://github.com/orkestrel/core/blob/36bb4ac962a6eb83d3b3b7e1d15ed7b2fd751427/src/adapters/queue.ts#L45)

Construct a QueueAdapter with optional configuration defaults.

#### Parameters

##### options

[`QueueAdapterOptions`](../interfaces/QueueAdapterOptions.md) = `{}`

Configuration options for queue behavior:
- capacity: Maximum number of items the queue can hold (unlimited if not specified)
- concurrency: Default maximum number of tasks to run concurrently
- timeout: Default per-task timeout in milliseconds
- deadline: Default shared deadline in milliseconds for all tasks
- signal: Default AbortSignal for cancellation
- logger: Optional logger port for diagnostics
- diagnostic: Optional diagnostic port for telemetry

#### Returns

`QueueAdapter`\<`T`\>

## Accessors

### diagnostic

#### Get Signature

> **get** **diagnostic**(): [`DiagnosticPort`](../interfaces/DiagnosticPort.md)

Defined in: [adapters/queue.ts:69](https://github.com/orkestrel/core/blob/36bb4ac962a6eb83d3b3b7e1d15ed7b2fd751427/src/adapters/queue.ts#L69)

Access the diagnostic port used by this queue adapter for telemetry and error signaling.

##### Returns

[`DiagnosticPort`](../interfaces/DiagnosticPort.md)

The configured DiagnosticPort instance

***

### logger

#### Get Signature

> **get** **logger**(): [`LoggerPort`](../interfaces/LoggerPort.md)

Defined in: [adapters/queue.ts:62](https://github.com/orkestrel/core/blob/36bb4ac962a6eb83d3b3b7e1d15ed7b2fd751427/src/adapters/queue.ts#L62)

Access the logger port used by this queue adapter.

##### Returns

[`LoggerPort`](../interfaces/LoggerPort.md)

The configured LoggerPort instance

## Methods

### dequeue()

> **dequeue**(): `Promise`\<`undefined` \| `T`\>

Defined in: [adapters/queue.ts:101](https://github.com/orkestrel/core/blob/36bb4ac962a6eb83d3b3b7e1d15ed7b2fd751427/src/adapters/queue.ts#L101)

Dequeue and return the next item from the queue.

#### Returns

`Promise`\<`undefined` \| `T`\>

The next item in FIFO order, or undefined if the queue is empty

#### Example

```ts
const item = await queue.dequeue()
if (item) console.log('Processing:', item)
```

#### Implementation of

[`QueuePort`](../interfaces/QueuePort.md).[`dequeue`](../interfaces/QueuePort.md#dequeue)

***

### enqueue()

> **enqueue**(`item`): `Promise`\<`void`\>

Defined in: [adapters/queue.ts:83](https://github.com/orkestrel/core/blob/36bb4ac962a6eb83d3b3b7e1d15ed7b2fd751427/src/adapters/queue.ts#L83)

Enqueue a single item to the in-memory FIFO queue.

#### Parameters

##### item

`T`

The item to add to the queue

#### Returns

`Promise`\<`void`\>

void

#### Throws

Error with code ORK1050 when capacity is set and would be exceeded

#### Example

```ts
await queue.enqueue({ id: 1, data: 'task payload' })
```

#### Implementation of

[`QueuePort`](../interfaces/QueuePort.md).[`enqueue`](../interfaces/QueuePort.md#enqueue)

***

### run()

> **run**\<`R`\>(`tasks`, `options`): `Promise`\<readonly `R`[]\>

Defined in: [adapters/queue.ts:145](https://github.com/orkestrel/core/blob/36bb4ac962a6eb83d3b3b7e1d15ed7b2fd751427/src/adapters/queue.ts#L145)

Run a set of tasks with optional concurrency control, timeouts, and a shared deadline.

Tasks are executed with the specified concurrency limit (defaults to unlimited). Results are
returned in the same order as the input tasks, regardless of completion timing. When both
a per-task timeout and a shared deadline are provided, the effective limit is the minimum
of the two for each task. If the shared deadline elapses or a task times out, execution
aborts with an error (ORK1052 for task timeout, ORK1053 for shared deadline exceeded).

#### Type Parameters

##### R

`R`

The return type of the tasks

#### Parameters

##### tasks

readonly () => `R` \| `Promise`\<`R`\>[]

Array of task functions (sync or async) to execute

##### options

[`QueueRunOptions`](../interfaces/QueueRunOptions.md) = `{}`

Run options (overrides constructor defaults):
- concurrency: Maximum number of tasks to run concurrently
- timeout: Per-task timeout in milliseconds
- deadline: Shared deadline in milliseconds for all tasks
- signal: AbortSignal to cancel execution

#### Returns

`Promise`\<readonly `R`[]\>

Array of task results in the same order as input tasks

#### Throws

Error with code ORK1051 when aborted, ORK1052 on task timeout, or ORK1053 on shared deadline exceeded

#### Example

```ts
const results = await queue.run([
  async () => fetchUser(1),
  async () => fetchUser(2),
  async () => fetchUser(3),
], { concurrency: 2, timeout: 5000 })
console.log('Fetched users:', results)
```

#### Implementation of

[`QueuePort`](../interfaces/QueuePort.md).[`run`](../interfaces/QueuePort.md#run)

***

### size()

> **size**(): `Promise`\<`number`\>

Defined in: [adapters/queue.ts:114](https://github.com/orkestrel/core/blob/36bb4ac962a6eb83d3b3b7e1d15ed7b2fd751427/src/adapters/queue.ts#L114)

Return the current number of items in the queue.

#### Returns

`Promise`\<`number`\>

The queue size

#### Example

```ts
const currentSize = await queue.size()
console.log(`Queue has ${currentSize} items`)
```

#### Implementation of

[`QueuePort`](../interfaces/QueuePort.md).[`size`](../interfaces/QueuePort.md#size)
