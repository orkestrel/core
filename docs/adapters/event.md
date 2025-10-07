# Event (Port + Adapter)

Topic-based async pub/sub for your application events. Supports sequential or concurrent delivery with isolated error handling.

## Purpose
- Publish typed payloads to string topics.
- Subscribe handlers that can be sync or async.
- Choose sequential delivery (default) or concurrent delivery per adapter.

## Contract
- Port: EventPort<EMap>
  - publish<E extends keyof EMap & string>(topic: E, payload: EMap[E]): Promise<void>
  - subscribe<E extends keyof EMap & string>(topic: E, handler: (payload: EMap[E]) => void | Promise<void>): Promise<() => void | Promise<void>>
  - topics(): ReadonlyArray<string>

## Default adapter
- EventAdapter
  - Options: { sequential?: boolean; onError?: (err: unknown, topic: string) => void }
  - Sequential by default; set sequential: false for concurrent delivery.
  - Errors in handlers are isolated and reported via onError (if provided).

## Usage
```ts
import { type EventPort, EventAdapter } from '@orkestrel/core'

type Events = {
  'orders.created': { id: string }
  'orders.cancelled': { id: string; reason?: string }
}

const ev: EventPort<Events> = new EventAdapter({ sequential: true })
const unsub = await ev.subscribe('orders.created', async (o) => {
  console.log('order created', o.id)
})
await ev.publish('orders.created', { id: '1' })
await unsub()
```

## Notes
- Event is distinct from Emitter. Emitter is a small synchronous emitter used internally (e.g., by Lifecycle). Event is a typed pub/sub bus for your domain topics.
- subscribe() returns an unsubscribe function. When the last handler is removed for a topic, the topic is cleaned up.
- topics() returns only topics with at least one active handler.
- onError is best-effort: its own errors are swallowed to avoid cascading failures.
