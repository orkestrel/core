[**@orkestrel/core**](../index.md)

***

# Class: EventAdapter

Defined in: [adapters/event.ts:25](https://github.com/orkestrel/core/blob/240d6e1612057b96fd3fc03e1415fe3917a0f212/src/adapters/event.ts#L25)

Topic-based asynchronous publish-subscribe event bus.

Provides an in-memory event bus where handlers can subscribe to topics and publishers can emit payloads.
Supports both sequential (default) and concurrent handler invocation modes. Errors thrown by handlers
are isolated and reported via the optional onError callback and diagnostic port.

## Example

```ts
import { EventAdapter } from '@orkestrel/core'
type Events = { 'user:created': { id: string, name: string }, 'user:deleted': { id: string } }
const bus = new EventAdapter<Events>({ sequential: true })
const unsubscribe = await bus.subscribe('user:created', async (payload) => {
  console.log('User created:', payload.id, payload.name)
})
await bus.publish('user:created', { id: 'u1', name: 'Alice' })
await unsubscribe()
```

## Implements

- [`EventPort`](../interfaces/EventPort.md)

## Constructors

### Constructor

> **new EventAdapter**(`options`): `EventAdapter`

Defined in: [adapters/event.ts:43](https://github.com/orkestrel/core/blob/240d6e1612057b96fd3fc03e1415fe3917a0f212/src/adapters/event.ts#L43)

Construct an EventAdapter with optional configuration.

#### Parameters

##### options

[`EventAdapterOptions`](../interfaces/EventAdapterOptions.md) = `{}`

Configuration options:
- onError: Optional callback invoked when a handler throws an error
- sequential: When true (default), handlers are invoked sequentially; when false, handlers run concurrently
- logger: Optional logger port for diagnostics
- diagnostic: Optional diagnostic port for telemetry

#### Returns

`EventAdapter`

## Accessors

### diagnostic

#### Get Signature

> **get** **diagnostic**(): [`DiagnosticPort`](../interfaces/DiagnosticPort.md)

Defined in: [adapters/event.ts:63](https://github.com/orkestrel/core/blob/240d6e1612057b96fd3fc03e1415fe3917a0f212/src/adapters/event.ts#L63)

Access the diagnostic port used by this event adapter.

##### Returns

[`DiagnosticPort`](../interfaces/DiagnosticPort.md)

The configured DiagnosticPort instance

***

### logger

#### Get Signature

> **get** **logger**(): [`LoggerPort`](../interfaces/LoggerPort.md)

Defined in: [adapters/event.ts:56](https://github.com/orkestrel/core/blob/240d6e1612057b96fd3fc03e1415fe3917a0f212/src/adapters/event.ts#L56)

Access the logger port used by this event adapter.

##### Returns

[`LoggerPort`](../interfaces/LoggerPort.md)

The configured LoggerPort instance

## Methods

### publish()

> **publish**\<`T`\>(`topic`, `payload`): `Promise`\<`void`\>

Defined in: [adapters/event.ts:80](https://github.com/orkestrel/core/blob/240d6e1612057b96fd3fc03e1415fe3917a0f212/src/adapters/event.ts#L80)

Publish a payload to a topic, invoking all subscribed handlers.

In sequential mode (default), handlers are awaited one-by-one in subscription order.
In concurrent mode, handlers are invoked in parallel via Promise.all.
Handler errors are isolated and reported via onError and diagnostic callbacks.

#### Type Parameters

##### T

`T`

#### Parameters

##### topic

`string`

The topic name to publish to

##### payload

`T`

The payload value to pass to all subscribed handlers

#### Returns

`Promise`\<`void`\>

#### Example

```ts
await bus.publish('user:created', { id: 'u123', name: 'Bob' })
```

#### Implementation of

[`EventPort`](../interfaces/EventPort.md).[`publish`](../interfaces/EventPort.md#publish)

***

### subscribe()

> **subscribe**\<`T`\>(`topic`, `handler`): `Promise`\<() => `void` \| `Promise`\<`void`\>\>

Defined in: [adapters/event.ts:128](https://github.com/orkestrel/core/blob/240d6e1612057b96fd3fc03e1415fe3917a0f212/src/adapters/event.ts#L128)

Subscribe a handler function to a topic.

The handler will be invoked whenever a payload is published to the topic.
Returns an unsubscribe function to remove the handler later.

#### Type Parameters

##### T

`T`

#### Parameters

##### topic

`string`

The topic name to subscribe to

##### handler

[`EventHandler`](../type-aliases/EventHandler.md)\<`T`\>

Handler function (sync or async) that receives the topic payload

#### Returns

`Promise`\<() => `void` \| `Promise`\<`void`\>\>

An async unsubscribe function that removes the handler when called

#### Example

```ts
const unsubscribe = await bus.subscribe('user:created', async (user) => {
  console.log('New user:', user.name)
})
// Later, to unsubscribe:
await unsubscribe()
```

#### Implementation of

[`EventPort`](../interfaces/EventPort.md).[`subscribe`](../interfaces/EventPort.md#subscribe)

***

### topics()

> **topics**(): readonly `string`[]

Defined in: [adapters/event.ts:152](https://github.com/orkestrel/core/blob/240d6e1612057b96fd3fc03e1415fe3917a0f212/src/adapters/event.ts#L152)

List all currently active topic names that have at least one subscriber.

#### Returns

readonly `string`[]

A read-only array of topic name strings

#### Example

```ts
console.log('Active topics:', bus.topics())
// => ['user:created', 'user:deleted']
```

#### Implementation of

[`EventPort`](../interfaces/EventPort.md).[`topics`](../interfaces/EventPort.md#topics)
