[**@orkestrel/core**](../index.md)

***

# Interface: OrchestratorOptions

Defined in: [types.ts:294](https://github.com/orkestrel/core/blob/ccb170966790f428093f11a71a5646a6e842dbf9/src/types.ts#L294)

## Properties

### diagnostic?

> `readonly` `optional` **diagnostic**: [`DiagnosticPort`](DiagnosticPort.md)

Defined in: [types.ts:309](https://github.com/orkestrel/core/blob/ccb170966790f428093f11a71a5646a6e842dbf9/src/types.ts#L309)

***

### events?

> `readonly` `optional` **events**: `object`

Defined in: [types.ts:296](https://github.com/orkestrel/core/blob/ccb170966790f428093f11a71a5646a6e842dbf9/src/types.ts#L296)

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

Defined in: [types.ts:306](https://github.com/orkestrel/core/blob/ccb170966790f428093f11a71a5646a6e842dbf9/src/types.ts#L306)

***

### logger?

> `readonly` `optional` **logger**: [`LoggerPort`](LoggerPort.md)

Defined in: [types.ts:308](https://github.com/orkestrel/core/blob/ccb170966790f428093f11a71a5646a6e842dbf9/src/types.ts#L308)

***

### queue?

> `readonly` `optional` **queue**: [`QueuePort`](QueuePort.md)\<`unknown`\>

Defined in: [types.ts:307](https://github.com/orkestrel/core/blob/ccb170966790f428093f11a71a5646a6e842dbf9/src/types.ts#L307)

***

### timeouts?

> `readonly` `optional` **timeouts**: `number` \| `Readonly`\<\{ `onDestroy?`: `number`; `onStart?`: `number`; `onStop?`: `number`; \}\>

Defined in: [types.ts:295](https://github.com/orkestrel/core/blob/ccb170966790f428093f11a71a5646a6e842dbf9/src/types.ts#L295)

***

### tracer?

> `readonly` `optional` **tracer**: `object`

Defined in: [types.ts:302](https://github.com/orkestrel/core/blob/ccb170966790f428093f11a71a5646a6e842dbf9/src/types.ts#L302)

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
