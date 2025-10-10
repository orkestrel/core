[**@orkestrel/core**](../index.md)

***

# Abstract Class: Lifecycle

Defined in: [lifecycle.ts:44](https://github.com/orkestrel/core/blob/7cc3e19bc4a1e6f96f153d7b931686981208a465/src/lifecycle.ts#L44)

Abstract deterministic lifecycle with hook timeouts and events.

States: 'created' → 'started' → 'stopped' → 'destroyed'.
Override protected hooks (onCreate/onStart/onStop/onDestroy/onTransition) to implement behavior.
Use .on('transition' | 'create' | 'start' | 'stop' | 'destroy' | 'error') to observe lifecycle events.

Options
-------
- timeouts: number of milliseconds to cap each hook (default: 5000).
- emitInitial: when true (default), first transition listener receives the current state immediately.
- emitter: custom EmitterPort to receive events.
- queue: custom QueuePort to serialize hooks and apply deadlines.
- logger/diagnostic: ports used by default adapters and error reporting.

## Example

```ts
import { Lifecycle } from '@orkestrel/core'

class Cache extends Lifecycle {
  private map = new Map<string, string>()
  protected async onStart() { // warm up, connect, etc. }
  protected async onStop() { this.map.clear() }
}

const c = new Cache({ timeouts: 2000 })
c.on('transition', (s) => console.log('state:', s))
await c.start()
await c.stop()
await c.destroy()
```

## Extended by

- [`Adapter`](Adapter.md)

## Constructors

### Constructor

> **new Lifecycle**(`opts`): `Lifecycle`

Defined in: [lifecycle.ts:65](https://github.com/orkestrel/core/blob/7cc3e19bc4a1e6f96f153d7b931686981208a465/src/lifecycle.ts#L65)

Construct a Lifecycle with optional configuration for timeouts, emitters, queue, logger, and diagnostic ports.

#### Parameters

##### opts

[`LifecycleOptions`](../interfaces/LifecycleOptions.md) = `{}`

Configuration options:
- timeouts: Timeout in milliseconds for each lifecycle hook (default: 5000)
- emitInitial: Whether to emit the current state immediately on first transition listener (default: true)
- emitter: Optional custom emitter port
- queue: Optional custom queue port for serializing hooks
- logger: Optional logger port
- diagnostic: Optional diagnostic port for telemetry and errors

#### Returns

`Lifecycle`

## Accessors

### diagnostics

#### Get Signature

> **get** **diagnostics**(): [`DiagnosticPort`](../interfaces/DiagnosticPort.md)

Defined in: [lifecycle.ts:105](https://github.com/orkestrel/core/blob/7cc3e19bc4a1e6f96f153d7b931686981208a465/src/lifecycle.ts#L105)

Access the diagnostic port used for telemetry and error reporting.

##### Returns

[`DiagnosticPort`](../interfaces/DiagnosticPort.md)

The DiagnosticPort instance

***

### emitter

#### Get Signature

> **get** **emitter**(): [`EmitterPort`](../interfaces/EmitterPort.md)\<[`LifecycleEventMap`](../type-aliases/LifecycleEventMap.md)\>

Defined in: [lifecycle.ts:82](https://github.com/orkestrel/core/blob/7cc3e19bc4a1e6f96f153d7b931686981208a465/src/lifecycle.ts#L82)

Access the emitter port used for lifecycle events.

Events include: 'transition', 'create', 'start', 'stop', 'destroy', 'error'.

##### Returns

[`EmitterPort`](../interfaces/EmitterPort.md)\<[`LifecycleEventMap`](../type-aliases/LifecycleEventMap.md)\>

The EmitterPort instance for lifecycle events

***

### logger

#### Get Signature

> **get** **logger**(): [`LoggerPort`](../interfaces/LoggerPort.md)

Defined in: [lifecycle.ts:98](https://github.com/orkestrel/core/blob/7cc3e19bc4a1e6f96f153d7b931686981208a465/src/lifecycle.ts#L98)

Access the logger port backing this lifecycle.

This logger is propagated to default adapters when not explicitly provided.

##### Returns

[`LoggerPort`](../interfaces/LoggerPort.md)

The LoggerPort instance

***

### queue

#### Get Signature

> **get** **queue**(): [`QueuePort`](../interfaces/QueuePort.md)

Defined in: [lifecycle.ts:89](https://github.com/orkestrel/core/blob/7cc3e19bc4a1e6f96f153d7b931686981208a465/src/lifecycle.ts#L89)

Access the queue port used to serialize hooks and enforce deadlines.

##### Returns

[`QueuePort`](../interfaces/QueuePort.md)

The QueuePort instance for running lifecycle hooks

***

### state

#### Get Signature

> **get** **state**(): [`LifecycleState`](../type-aliases/LifecycleState.md)

Defined in: [lifecycle.ts:112](https://github.com/orkestrel/core/blob/7cc3e19bc4a1e6f96f153d7b931686981208a465/src/lifecycle.ts#L112)

Get the current lifecycle state.

##### Returns

[`LifecycleState`](../type-aliases/LifecycleState.md)

The current state: 'created', 'started', 'stopped', or 'destroyed'

## Methods

### create()

> **create**(): `Promise`\<`void`\>

Defined in: [lifecycle.ts:210](https://github.com/orkestrel/core/blob/7cc3e19bc4a1e6f96f153d7b931686981208a465/src/lifecycle.ts#L210)

Create the lifecycle (idempotent no-op by default).

May be called before start in complex setups. Override onCreate() to add creation behavior.

#### Returns

`Promise`\<`void`\>

#### Throws

Error with code ORK1020 if the current state is not 'created'

#### Example

```ts
await lifecycle.create()
```

***

### destroy()

> **destroy**(): `Promise`\<`void`\>

Defined in: [lifecycle.ts:266](https://github.com/orkestrel/core/blob/7cc3e19bc4a1e6f96f153d7b931686981208a465/src/lifecycle.ts#L266)

Transition to 'destroyed' and remove all listeners.

Safe to call multiple times (idempotent). Invokes the onDestroy hook and removes all event listeners.

#### Returns

`Promise`\<`void`\>

#### Throws

Error with code ORK1021 if the hook times out

#### Throws

Error with code ORK1022 if the hook throws an error

#### Example

```ts
await lifecycle.destroy()
```

***

### off()

> **off**\<`T`\>(`evt`, `fn`): `this`

Defined in: [lifecycle.ts:167](https://github.com/orkestrel/core/blob/7cc3e19bc4a1e6f96f153d7b931686981208a465/src/lifecycle.ts#L167)

Unsubscribe a previously registered listener.

#### Type Parameters

##### T

`T` *extends* `"error"` \| `"start"` \| `"stop"` \| `"destroy"` \| `"create"` \| `"transition"`

Event key in the lifecycle event map

#### Parameters

##### evt

`T`

Event name to unsubscribe from

##### fn

(...`args`) => `void`

The exact listener function to remove (must be same reference used in `on`)

#### Returns

`this`

This lifecycle instance for chaining

#### Example

```ts
const handler = (state) => console.log(state)
lifecycle.on('transition', handler)
lifecycle.off('transition', handler)
```

***

### on()

> **on**\<`T`\>(`evt`, `fn`): `this`

Defined in: [lifecycle.ts:142](https://github.com/orkestrel/core/blob/7cc3e19bc4a1e6f96f153d7b931686981208a465/src/lifecycle.ts#L142)

Subscribe to a lifecycle event.

Supported events: 'transition', 'create', 'start', 'stop', 'destroy', 'error'.
The first 'transition' listener will receive the current state immediately when emitInitial is true (default).

#### Type Parameters

##### T

`T` *extends* `"error"` \| `"start"` \| `"stop"` \| `"destroy"` \| `"create"` \| `"transition"`

Event key in the lifecycle event map

#### Parameters

##### evt

`T`

Event name to subscribe to

##### fn

(...`args`) => `void`

Listener function receiving tuple-typed arguments for the event

#### Returns

`this`

This lifecycle instance for chaining

#### Example

```ts
lifecycle.on('transition', (state) => console.log('State:', state))
lifecycle.on('error', (err) => console.error('Lifecycle error:', err))
lifecycle.on('start', () => console.log('Started'))
```

***

### onCreate()

> `protected` **onCreate**(): `Promise`\<`void`\>

Defined in: [lifecycle.ts:283](https://github.com/orkestrel/core/blob/7cc3e19bc4a1e6f96f153d7b931686981208a465/src/lifecycle.ts#L283)

#### Returns

`Promise`\<`void`\>

***

### onDestroy()

> `protected` **onDestroy**(): `Promise`\<`void`\>

Defined in: [lifecycle.ts:292](https://github.com/orkestrel/core/blob/7cc3e19bc4a1e6f96f153d7b931686981208a465/src/lifecycle.ts#L292)

#### Returns

`Promise`\<`void`\>

***

### onStart()

> `protected` **onStart**(): `Promise`\<`void`\>

Defined in: [lifecycle.ts:286](https://github.com/orkestrel/core/blob/7cc3e19bc4a1e6f96f153d7b931686981208a465/src/lifecycle.ts#L286)

#### Returns

`Promise`\<`void`\>

***

### onStop()

> `protected` **onStop**(): `Promise`\<`void`\>

Defined in: [lifecycle.ts:289](https://github.com/orkestrel/core/blob/7cc3e19bc4a1e6f96f153d7b931686981208a465/src/lifecycle.ts#L289)

#### Returns

`Promise`\<`void`\>

***

### onTransition()

> `protected` **onTransition**(`_from`, `_to`, `_hook`): `Promise`\<`void`\>

Defined in: [lifecycle.ts:295](https://github.com/orkestrel/core/blob/7cc3e19bc4a1e6f96f153d7b931686981208a465/src/lifecycle.ts#L295)

#### Parameters

##### \_from

[`LifecycleState`](../type-aliases/LifecycleState.md)

##### \_to

[`LifecycleState`](../type-aliases/LifecycleState.md)

##### \_hook

[`LifecycleHook`](../type-aliases/LifecycleHook.md)

#### Returns

`Promise`\<`void`\>

***

### setState()

> `protected` **setState**(`next`): `void`

Defined in: [lifecycle.ts:115](https://github.com/orkestrel/core/blob/7cc3e19bc4a1e6f96f153d7b931686981208a465/src/lifecycle.ts#L115)

#### Parameters

##### next

[`LifecycleState`](../type-aliases/LifecycleState.md)

#### Returns

`void`

***

### start()

> **start**(): `Promise`\<`void`\>

Defined in: [lifecycle.ts:229](https://github.com/orkestrel/core/blob/7cc3e19bc4a1e6f96f153d7b931686981208a465/src/lifecycle.ts#L229)

Transition from 'created' or 'stopped' to 'started'.

Invokes the onStart hook and emits 'start' and 'transition' events on success.

#### Returns

`Promise`\<`void`\>

#### Throws

Error with code ORK1020 if the transition is invalid

#### Throws

Error with code ORK1021 if the hook times out

#### Throws

Error with code ORK1022 if the hook throws an error

#### Example

```ts
await lifecycle.start()
```

***

### stop()

> **stop**(): `Promise`\<`void`\>

Defined in: [lifecycle.ts:248](https://github.com/orkestrel/core/blob/7cc3e19bc4a1e6f96f153d7b931686981208a465/src/lifecycle.ts#L248)

Transition from 'started' to 'stopped'.

Invokes the onStop hook and emits 'stop' and 'transition' events on success.

#### Returns

`Promise`\<`void`\>

#### Throws

Error with code ORK1020 if the transition is invalid (e.g., not currently 'started')

#### Throws

Error with code ORK1021 if the hook times out

#### Throws

Error with code ORK1022 if the hook throws an error

#### Example

```ts
await lifecycle.stop()
```
