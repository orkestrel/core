[**@orkestrel/core**](../index.md)

***

# Variable: orchestrator

> `const` **orchestrator**: (`name?`) => [`Orchestrator`](../classes/Orchestrator.md) & `object`

Defined in: [orchestrator.ts:564](https://github.com/orkestrel/core/blob/cbe5b2d7b027ca6f0f1301ef32750afb69b4764b/src/orchestrator.ts#L564)

Global orchestrator getter.
- Returns the default or a named orchestrator instance bound to a container.
- Manage instances via set/clear/list; use using() to run scoped work.

## Type Declaration

### using()

> **using**: \{(`fn`, `name?`): `Promise`\<`void`\>; \<`T`\>(`fn`, `name?`): `Promise`\<`T`\>; \<`T`\>(`apply`, `fn`, `name?`): `Promise`\<`T`\>; \} = `orchestratorUsing`

#### Call Signature

> (`fn`, `name?`): `Promise`\<`void`\>

##### Parameters

###### fn

(`app`) => `void` \| `Promise`\<`void`\>

###### name?

`string` | `symbol`

##### Returns

`Promise`\<`void`\>

#### Call Signature

> \<`T`\>(`fn`, `name?`): `Promise`\<`T`\>

##### Type Parameters

###### T

`T`

##### Parameters

###### fn

(`app`) => `T` \| `Promise`\<`T`\>

###### name?

`string` | `symbol`

##### Returns

`Promise`\<`T`\>

#### Call Signature

> \<`T`\>(`apply`, `fn`, `name?`): `Promise`\<`T`\>

##### Type Parameters

###### T

`T`

##### Parameters

###### apply

(`app`) => `void` \| `Promise`\<`void`\>

###### fn

(`app`) => `T` \| `Promise`\<`T`\>

###### name?

`string` | `symbol`

##### Returns

`Promise`\<`T`\>

### clear()

> **clear**(`name?`, `force?`): `boolean`

#### Parameters

##### name?

`string` | `symbol`

##### force?

`boolean`

#### Returns

`boolean`

### list()

> **list**(): (`string` \| `symbol`)[]

#### Returns

(`string` \| `symbol`)[]

### set()

> **set**(`name`, `app`, `lock?`): `void`

#### Parameters

##### name

`string` | `symbol`

##### app

[`Orchestrator`](../classes/Orchestrator.md)

##### lock?

`boolean`

#### Returns

`void`

## Example

```ts
import { orchestrator, createToken, register, Container } from '@orkestrel/core'

const app = orchestrator()
const T = createToken<number>('val')
await app.container.using(scope => scope.set(T, 7))
```
