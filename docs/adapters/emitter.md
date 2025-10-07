# Emitter (Port + Adapter)

A minimal, synchronous event emitter used by Lifecycle for state and hook events. It’s intentionally small and dependency-free.

## Purpose
- Drive internal lifecycle observability via simple events without external deps.
- Emit local, synchronous signals (state changes, hook completions, errors).
- Prefer Event (pub/sub) for domain topics; use Emitter for lightweight internal wiring.

## Contract
- Port: EmitterPort
  - on(event: string, fn: (...args: unknown[]) => void): this
  - off(event: string, fn: (...args: unknown[]) => void): this
  - emit(event: string, ...args: unknown[]): void
  - removeAllListeners(): void

## Default adapter
- EmitterAdapter
  - Synchronous emission using a snapshot of listeners (safe if listeners mutate sets)
  - Listener errors are swallowed to avoid breaking emit loops
  - Removing the last listener for an event cleans up its internal set

## Usage
```ts
import { EmitterAdapter } from '@orkestrel/core'

const em = new EmitterAdapter()
const onTick = (n: number) => console.log('tick', n)
em.on('tick', onTick)
em.emit('tick', 1)
em.off('tick', onTick)
```

## Notes
- Lifecycle uses EmitterAdapter internally via the EmitterPort. You can observe:
  - `stateChange` for lifecycle transitions
  - hook events: `create`, `start`, `stop`, `destroy`
  - `error` when a hook throws
- If you don’t pass an emitter in LifecycleOptions, Lifecycle constructs a default EmitterAdapter so events like `stateChange` work out of the box. To integrate with a shared emitter, pass `opts.emitter` when constructing your Lifecycle subclass.
- Emission is synchronous; if you need to buffer or schedule events, wrap emitters externally.
