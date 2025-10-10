[**@orkestrel/core**](../index.md)

***

# Interface: OrchestratorOptions

Defined in: [types.ts:295](https://github.com/orkestrel/core/blob/98df1af1b029ad0f39e413b90869151f4152e5dd/src/types.ts#L295)

## Properties

### diagnostic?

> `readonly` `optional` **diagnostic**: [`DiagnosticPort`](DiagnosticPort.md)

Defined in: [types.ts:310](https://github.com/orkestrel/core/blob/98df1af1b029ad0f39e413b90869151f4152e5dd/src/types.ts#L310)

***

### events?

> `readonly` `optional` **events**: `object`

Defined in: [types.ts:297](https://github.com/orkestrel/core/blob/98df1af1b029ad0f39e413b90869151f4152e5dd/src/types.ts#L297)

#### onComponentDestroy()?

> `optional` **onComponentDestroy**: (`info`) => `void`

##### Parameters

###### info

###### durationMs

`number`

###### token

[`Token`](../type-aliases/Token.md)\<`unknown`\>

##### Returns

`void`

#### onComponentError()?

> `optional` **onComponentError**: (`detail`) => `void`

##### Parameters

###### detail

[`LifecycleErrorDetail`](LifecycleErrorDetail.md)

##### Returns

`void`

#### onComponentStart()?

> `optional` **onComponentStart**: (`info`) => `void`

##### Parameters

###### info

###### durationMs

`number`

###### token

[`Token`](../type-aliases/Token.md)\<`unknown`\>

##### Returns

`void`

#### onComponentStop()?

> `optional` **onComponentStop**: (`info`) => `void`

##### Parameters

###### info

###### durationMs

`number`

###### token

[`Token`](../type-aliases/Token.md)\<`unknown`\>

##### Returns

`void`

***

### layer?

> `readonly` `optional` **layer**: [`LayerPort`](LayerPort.md)

Defined in: [types.ts:307](https://github.com/orkestrel/core/blob/98df1af1b029ad0f39e413b90869151f4152e5dd/src/types.ts#L307)

***

### logger?

> `readonly` `optional` **logger**: [`LoggerPort`](LoggerPort.md)

Defined in: [types.ts:309](https://github.com/orkestrel/core/blob/98df1af1b029ad0f39e413b90869151f4152e5dd/src/types.ts#L309)

***

### queue?

> `readonly` `optional` **queue**: [`QueuePort`](QueuePort.md)\<`unknown`\>

Defined in: [types.ts:308](https://github.com/orkestrel/core/blob/98df1af1b029ad0f39e413b90869151f4152e5dd/src/types.ts#L308)

***

### timeouts?

> `readonly` `optional` **timeouts**: `number` \| `Readonly`\<\{ `onDestroy?`: `number`; `onStart?`: `number`; `onStop?`: `number`; \}\>

Defined in: [types.ts:296](https://github.com/orkestrel/core/blob/98df1af1b029ad0f39e413b90869151f4152e5dd/src/types.ts#L296)

***

### tracer?

> `readonly` `optional` **tracer**: `object`

Defined in: [types.ts:303](https://github.com/orkestrel/core/blob/98df1af1b029ad0f39e413b90869151f4152e5dd/src/types.ts#L303)

#### onLayers()?

> `optional` **onLayers**: (`payload`) => `void`

##### Parameters

###### payload

###### layers

`string`[][]

##### Returns

`void`

#### onPhase()?

> `optional` **onPhase**: (`payload`) => `void`

##### Parameters

###### payload

###### layer

`number`

###### outcomes

`Readonly`\<\{ `durationMs`: `number`; `ok`: `boolean`; `timedOut?`: `boolean`; `token`: `string`; \}\>[]

###### phase

[`LifecyclePhase`](../type-aliases/LifecyclePhase.md)

##### Returns

`void`
