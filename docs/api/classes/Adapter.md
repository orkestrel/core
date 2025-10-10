[**@orkestrel/core**](../index.md)

***

# Abstract Class: Adapter

Defined in: [adapter.ts:40](https://github.com/orkestrel/core/blob/36bb4ac962a6eb83d3b3b7e1d15ed7b2fd751427/src/adapter.ts#L40)

Base class for building adapters/components that participate in a deterministic lifecycle.

Extends [Lifecycle](Lifecycle.md) and exposes the same hook surface (override the protected onX methods).
You typically subclass Adapter, implement the hooks you need, and then register an instance with
a [Container](Container.md) or [Orchestrator](Orchestrator.md).

## Example

```ts
import { Adapter, createToken, Container } from '@orkestrel/core'

// Define a component by subclassing Adapter and overriding hooks
class HttpServer extends Adapter {
  private server?: { listen: () => Promise<void>, close: () => Promise<void> }
  constructor(private readonly port: number) { super() }
  protected async onStart() {
    // create server; await server.listen()
    this.server = undefined
  }
  protected async onStop() {
    // await this.server?.close()
  }
}

// Register and drive it via the container
const TOK = createToken<HttpServer>('http')
const container = new Container()
container.register(TOK, { useFactory: () => new HttpServer(3000) })
const srv = container.resolve(TOK)
await srv.start()
await srv.stop()
await container.destroy() // ensures srv is destroyed
```

## Remarks

Override any of the protected hooks: onCreate, onStart, onStop, onDestroy, onTransition.

## Extends

- [`Lifecycle`](Lifecycle.md)

## Constructors

### Constructor

> **new Adapter**(`opts`): `Adapter`

Defined in: [lifecycle.ts:65](https://github.com/orkestrel/core/blob/36bb4ac962a6eb83d3b3b7e1d15ed7b2fd751427/src/lifecycle.ts#L65)

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

`Adapter`

#### Inherited from

[`Lifecycle`](Lifecycle.md).[`constructor`](Lifecycle.md#constructor)

## Accessors

### diagnostics

#### Get Signature

> **get** **diagnostics**(): [`DiagnosticPort`](../interfaces/DiagnosticPort.md)

Defined in: [lifecycle.ts:105](https://github.com/orkestrel/core/blob/36bb4ac962a6eb83d3b3b7e1d15ed7b2fd751427/src/lifecycle.ts#L105)

Access the diagnostic port used for telemetry and error reporting.

##### Returns

[`DiagnosticPort`](../interfaces/DiagnosticPort.md)

The DiagnosticPort instance

#### Inherited from

[`Lifecycle`](Lifecycle.md).[`diagnostics`](Lifecycle.md#diagnostics)

***

### emitter

#### Get Signature

> **get** **emitter**(): [`EmitterPort`](../interfaces/EmitterPort.md)\<[`LifecycleEventMap`](../type-aliases/LifecycleEventMap.md)\>

Defined in: [lifecycle.ts:82](https://github.com/orkestrel/core/blob/36bb4ac962a6eb83d3b3b7e1d15ed7b2fd751427/src/lifecycle.ts#L82)

Access the emitter port used for lifecycle events.

Events include: 'transition', 'create', 'start', 'stop', 'destroy', 'error'.

##### Returns

[`EmitterPort`](../interfaces/EmitterPort.md)\<[`LifecycleEventMap`](../type-aliases/LifecycleEventMap.md)\>

The EmitterPort instance for lifecycle events

#### Inherited from

[`Lifecycle`](Lifecycle.md).[`emitter`](Lifecycle.md#emitter)

***

### logger

#### Get Signature

> **get** **logger**(): [`LoggerPort`](../interfaces/LoggerPort.md)

Defined in: [lifecycle.ts:98](https://github.com/orkestrel/core/blob/36bb4ac962a6eb83d3b3b7e1d15ed7b2fd751427/src/lifecycle.ts#L98)

Access the logger port backing this lifecycle.

This logger is propagated to default adapters when not explicitly provided.

##### Returns

[`LoggerPort`](../interfaces/LoggerPort.md)

The LoggerPort instance

#### Inherited from

[`Lifecycle`](Lifecycle.md).[`logger`](Lifecycle.md#logger)

***

### queue

#### Get Signature

> **get** **queue**(): [`QueuePort`](../interfaces/QueuePort.md)

Defined in: [lifecycle.ts:89](https://github.com/orkestrel/core/blob/36bb4ac962a6eb83d3b3b7e1d15ed7b2fd751427/src/lifecycle.ts#L89)

Access the queue port used to serialize hooks and enforce deadlines.

##### Returns

[`QueuePort`](../interfaces/QueuePort.md)

The QueuePort instance for running lifecycle hooks

#### Inherited from

[`Lifecycle`](Lifecycle.md).[`queue`](Lifecycle.md#queue)

***

### state

#### Get Signature

> **get** **state**(): [`LifecycleState`](../type-aliases/LifecycleState.md)

Defined in: [lifecycle.ts:112](https://github.com/orkestrel/core/blob/36bb4ac962a6eb83d3b3b7e1d15ed7b2fd751427/src/lifecycle.ts#L112)

Get the current lifecycle state.

##### Returns

[`LifecycleState`](../type-aliases/LifecycleState.md)

The current state: 'created', 'started', 'stopped', or 'destroyed'

#### Inherited from

[`Lifecycle`](Lifecycle.md).[`state`](Lifecycle.md#state)

## Methods

### create()

> **create**(): `Promise`\<`void`\>

Defined in: [lifecycle.ts:210](https://github.com/orkestrel/core/blob/36bb4ac962a6eb83d3b3b7e1d15ed7b2fd751427/src/lifecycle.ts#L210)

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

#### Inherited from

[`Lifecycle`](Lifecycle.md).[`create`](Lifecycle.md#create)

***

### destroy()

> **destroy**(): `Promise`\<`void`\>

Defined in: [lifecycle.ts:266](https://github.com/orkestrel/core/blob/36bb4ac962a6eb83d3b3b7e1d15ed7b2fd751427/src/lifecycle.ts#L266)

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

#### Inherited from

[`Lifecycle`](Lifecycle.md).[`destroy`](Lifecycle.md#destroy)

***

### off()

> **off**\<`T`\>(`evt`, `fn`): `this`

Defined in: [lifecycle.ts:167](https://github.com/orkestrel/core/blob/36bb4ac962a6eb83d3b3b7e1d15ed7b2fd751427/src/lifecycle.ts#L167)

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

#### Inherited from

[`Lifecycle`](Lifecycle.md).[`off`](Lifecycle.md#off)

***

### on()

> **on**\<`T`\>(`evt`, `fn`): `this`

Defined in: [lifecycle.ts:142](https://github.com/orkestrel/core/blob/36bb4ac962a6eb83d3b3b7e1d15ed7b2fd751427/src/lifecycle.ts#L142)

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

#### Inherited from

[`Lifecycle`](Lifecycle.md).[`on`](Lifecycle.md#on)

***

### onCreate()

> `protected` **onCreate**(): `Promise`\<`void`\>

Defined in: [adapter.ts:42](https://github.com/orkestrel/core/blob/36bb4ac962a6eb83d3b3b7e1d15ed7b2fd751427/src/adapter.ts#L42)

#### Returns

`Promise`\<`void`\>

#### Overrides

[`Lifecycle`](Lifecycle.md).[`onCreate`](Lifecycle.md#oncreate)

***

### onDestroy()

> `protected` **onDestroy**(): `Promise`\<`void`\>

Defined in: [adapter.ts:48](https://github.com/orkestrel/core/blob/36bb4ac962a6eb83d3b3b7e1d15ed7b2fd751427/src/adapter.ts#L48)

#### Returns

`Promise`\<`void`\>

#### Overrides

[`Lifecycle`](Lifecycle.md).[`onDestroy`](Lifecycle.md#ondestroy)

***

### onStart()

> `protected` **onStart**(): `Promise`\<`void`\>

Defined in: [adapter.ts:44](https://github.com/orkestrel/core/blob/36bb4ac962a6eb83d3b3b7e1d15ed7b2fd751427/src/adapter.ts#L44)

#### Returns

`Promise`\<`void`\>

#### Overrides

[`Lifecycle`](Lifecycle.md).[`onStart`](Lifecycle.md#onstart)

***

### onStop()

> `protected` **onStop**(): `Promise`\<`void`\>

Defined in: [adapter.ts:46](https://github.com/orkestrel/core/blob/36bb4ac962a6eb83d3b3b7e1d15ed7b2fd751427/src/adapter.ts#L46)

#### Returns

`Promise`\<`void`\>

#### Overrides

[`Lifecycle`](Lifecycle.md).[`onStop`](Lifecycle.md#onstop)

***

### onTransition()

> `protected` **onTransition**(`_from`, `_to`, `_hook`): `Promise`\<`void`\>

Defined in: [lifecycle.ts:295](https://github.com/orkestrel/core/blob/36bb4ac962a6eb83d3b3b7e1d15ed7b2fd751427/src/lifecycle.ts#L295)

#### Parameters

##### \_from

[`LifecycleState`](../type-aliases/LifecycleState.md)

##### \_to

[`LifecycleState`](../type-aliases/LifecycleState.md)

##### \_hook

[`LifecycleHook`](../type-aliases/LifecycleHook.md)

#### Returns

`Promise`\<`void`\>

#### Inherited from

[`Lifecycle`](Lifecycle.md).[`onTransition`](Lifecycle.md#ontransition)

***

### setState()

> `protected` **setState**(`next`): `void`

Defined in: [lifecycle.ts:115](https://github.com/orkestrel/core/blob/36bb4ac962a6eb83d3b3b7e1d15ed7b2fd751427/src/lifecycle.ts#L115)

#### Parameters

##### next

[`LifecycleState`](../type-aliases/LifecycleState.md)

#### Returns

`void`

#### Inherited from

[`Lifecycle`](Lifecycle.md).[`setState`](Lifecycle.md#setstate)

***

### start()

> **start**(): `Promise`\<`void`\>

Defined in: [lifecycle.ts:229](https://github.com/orkestrel/core/blob/36bb4ac962a6eb83d3b3b7e1d15ed7b2fd751427/src/lifecycle.ts#L229)

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

#### Inherited from

[`Lifecycle`](Lifecycle.md).[`start`](Lifecycle.md#start)

***

### stop()

> **stop**(): `Promise`\<`void`\>

Defined in: [lifecycle.ts:248](https://github.com/orkestrel/core/blob/36bb4ac962a6eb83d3b3b7e1d15ed7b2fd751427/src/lifecycle.ts#L248)

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

#### Inherited from

[`Lifecycle`](Lifecycle.md).[`stop`](Lifecycle.md#stop)
