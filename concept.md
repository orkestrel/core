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
