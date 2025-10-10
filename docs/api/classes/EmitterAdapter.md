[**@orkestrel/core**](../index.md)

***

# Class: EmitterAdapter\<EMap\>

Defined in: [adapters/emitter.ts:25](https://github.com/orkestrel/core/blob/076093e61b67cd3d4198b173439f047ddbc97abc/src/adapters/emitter.ts#L25)

In-memory event emitter implementation with typed tuple-based events.

Stores per-event listeners in sets and invokes them synchronously in insertion order.
Errors thrown by listeners are isolated via safeInvoke to prevent cascading failures.

## Example

```ts
import { EmitterAdapter } from '@orkestrel/core'
type Events = { start: [], data: [string], error: [Error] }
const emitter = new EmitterAdapter<Events>()
const onData = (s: string) => console.log('received:', s)
emitter.on('data', onData)
emitter.emit('start')
emitter.emit('data', 'hello world')
emitter.off('data', onData)
emitter.removeAllListeners()
```

## Type Parameters

### EMap

`EMap` *extends* [`EventMap`](../type-aliases/EventMap.md) = [`EventMap`](../type-aliases/EventMap.md)

## Implements

- [`EmitterPort`](../interfaces/EmitterPort.md)\<`EMap`\>

## Constructors

### Constructor

> **new EmitterAdapter**\<`EMap`\>(`options`): `EmitterAdapter`\<`EMap`\>

Defined in: [adapters/emitter.ts:40](https://github.com/orkestrel/core/blob/076093e61b67cd3d4198b173439f047ddbc97abc/src/adapters/emitter.ts#L40)

Construct an EmitterAdapter with optional logger and diagnostic ports.

#### Parameters

##### options

[`EmitterAdapterOptions`](../interfaces/EmitterAdapterOptions.md) = `{}`

Configuration options:
- logger: Optional logger port used for emitting any diagnostics
- diagnostic: Optional diagnostic port for telemetry and errors
   *

#### Returns

`EmitterAdapter`\<`EMap`\>

## Accessors

### diagnostic

#### Get Signature

> **get** **diagnostic**(): [`DiagnosticPort`](../interfaces/DiagnosticPort.md)

Defined in: [adapters/emitter.ts:57](https://github.com/orkestrel/core/blob/076093e61b67cd3d4198b173439f047ddbc97abc/src/adapters/emitter.ts#L57)

Access the diagnostic port used by this emitter.

##### Returns

[`DiagnosticPort`](../interfaces/DiagnosticPort.md)

The configured DiagnosticPort instance

***

### logger

#### Get Signature

> **get** **logger**(): [`LoggerPort`](../interfaces/LoggerPort.md)

Defined in: [adapters/emitter.ts:50](https://github.com/orkestrel/core/blob/076093e61b67cd3d4198b173439f047ddbc97abc/src/adapters/emitter.ts#L50)

Access the logger port used by this emitter.

##### Returns

[`LoggerPort`](../interfaces/LoggerPort.md)

The configured LoggerPort instance

## Methods

### emit()

> **emit**\<`E`\>(`event`, ...`args`): `void`

Defined in: [adapters/emitter.ts:126](https://github.com/orkestrel/core/blob/076093e61b67cd3d4198b173439f047ddbc97abc/src/adapters/emitter.ts#L126)

Emit an event with arguments, invoking all registered listeners synchronously.

#### Type Parameters

##### E

`E` *extends* `string`

#### Parameters

##### event

`E`

Event name (key in the event map)

##### args

...`EMap`\[`E`\]

Arguments matching the event's tuple signature

#### Returns

`void`

void (invokes listeners synchronously if any are registered)
   *

#### Example

```ts
emitter.emit('data', 'hello world')
```

#### Implementation of

[`EmitterPort`](../interfaces/EmitterPort.md).[`emit`](../interfaces/EmitterPort.md#emit)

***

### off()

> **off**\<`E`\>(`event`, `fn`): `this`

Defined in: [adapters/emitter.ts:105](https://github.com/orkestrel/core/blob/076093e61b67cd3d4198b173439f047ddbc97abc/src/adapters/emitter.ts#L105)

Remove a previously registered listener for a specific event.

#### Type Parameters

##### E

`E` *extends* `string`

#### Parameters

##### event

`E`

Event name (key in the event map)

##### fn

[`EmitterListener`](../type-aliases/EmitterListener.md)\<`EMap`, `E`\>

The exact listener function to remove

#### Returns

`this`

This emitter instance for method chaining
   *

#### Example

```ts
const handler = (s: string) => console.log(s)
emitter.on('data', handler)
emitter.off('data', handler)
```

#### Implementation of

[`EmitterPort`](../interfaces/EmitterPort.md).[`off`](../interfaces/EmitterPort.md#off)

***

### on()

> **on**\<`E`\>(`event`, `fn`): `this`

Defined in: [adapters/emitter.ts:86](https://github.com/orkestrel/core/blob/076093e61b67cd3d4198b173439f047ddbc97abc/src/adapters/emitter.ts#L86)

Register a listener function for a specific event.

#### Type Parameters

##### E

`E` *extends* `string`

#### Parameters

##### event

`E`

Event name (key in the event map)

##### fn

[`EmitterListener`](../type-aliases/EmitterListener.md)\<`EMap`, `E`\>

Listener function that receives tuple-typed arguments matching the event signature

#### Returns

`this`

This emitter instance for method chaining
   *

#### Example

```ts
emitter.on('data', (value: string) => console.log('data:', value))
```

#### Implementation of

[`EmitterPort`](../interfaces/EmitterPort.md).[`on`](../interfaces/EmitterPort.md#on)

***

### removeAllListeners()

> **removeAllListeners**(): `void`

Defined in: [adapters/emitter.ts:147](https://github.com/orkestrel/core/blob/076093e61b67cd3d4198b173439f047ddbc97abc/src/adapters/emitter.ts#L147)

Remove all registered listeners for all events.

#### Returns

`void`

void (clears all event listener registrations)

#### Example

```ts
emitter.removeAllListeners()
```

#### Implementation of

[`EmitterPort`](../interfaces/EmitterPort.md).[`removeAllListeners`](../interfaces/EmitterPort.md#removealllisteners)
