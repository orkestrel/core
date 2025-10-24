Description: Implementation of an abstract Adapter class with lifecycle management, that would consolidate and replace the previous Adapter and Lifecycle concept.


```typescript
import type { LifecycleState, AdapterSubclass } from './types'
// lifecycle ['created', 'started', 'stopped', 'destroyed']
import { lifecycle } from './constants'

import { instanceOf } from "@orkestrel/validator";


export abstract class Adapter {
static #state: typeof lifecycle[number]
    
    /* Static Lifecycle Methods */
    
    static async create<I extends Adapter>(this: AdapterSubclass<I>): Promise<I> {
        return this.transition<I>('created')
    }

    static async start<I extends Adapter>(this: AdapterSubclass<I>): Promise<I> {
        return this.transition<I>('started')
    }

    static async stop<I extends Adapter>(this: AdapterSubclass<I>): Promise<I> {
        return this.transition<I>('stopped')
    }

    static async destroy<I extends Adapter>(this: AdapterSubclass<I>): Promise<void> {
        await this.transition<I>('destroyed')
    }

    // Generic Transition Method to handle state changes
    private static async transition<I extends Adapter>(this: AdapterSubclass<I>, to: LifecycleState): Promise<I> {
        //
    }

    /* Instance Hook Methods */
    
    protected async onCreate(): Promise<void> {}

    protected async onStart(): Promise<void> {}

    protected async onStop(): Promise<void> {}

    protected async onDestroy(): Promise<void> {}

    // Generic Transition Hook that runs on each state and is provided the state to narrow down actions
    protected async onTransition(_state: LifecycleState): Promise<void> {}
}
```


Description: Implementation of an Orchestrator that manages the lifecycle of Adapters within a Container, that registers a dependency graph instead of using a register function. This would mean the container needs to be updated and revised to accept and handle a dependency graph.

```ts
import { Orchestrator, Container, Adapter, createToken } from '@orkestrel/core'

class A extends Adapter {}
class B extends Adapter {}
const TA = createToken<A>('A')
const TB = createToken<B>('B')

const c = new Container()
const app = new Orchestrator(c)

await app.start({
    TA: { useFactory: () => new A() },
})

await app.register({
    TB: { useFactory: () => new B() , dependencies: [TA]}
})

await app.destroy()
```
