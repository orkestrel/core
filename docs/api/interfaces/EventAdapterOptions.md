[**@orkestrel/core**](../index.md)

***

# Interface: EventAdapterOptions

Defined in: [types.ts:181](https://github.com/orkestrel/core/blob/7cc3e19bc4a1e6f96f153d7b931686981208a465/src/types.ts#L181)

## Properties

### diagnostic?

> `readonly` `optional` **diagnostic**: [`DiagnosticPort`](DiagnosticPort.md)

Defined in: [types.ts:185](https://github.com/orkestrel/core/blob/7cc3e19bc4a1e6f96f153d7b931686981208a465/src/types.ts#L185)

***

### logger?

> `readonly` `optional` **logger**: [`LoggerPort`](LoggerPort.md)

Defined in: [types.ts:184](https://github.com/orkestrel/core/blob/7cc3e19bc4a1e6f96f153d7b931686981208a465/src/types.ts#L184)

***

### onError()?

> `readonly` `optional` **onError**: (`err`, `topic`) => `void`

Defined in: [types.ts:182](https://github.com/orkestrel/core/blob/7cc3e19bc4a1e6f96f153d7b931686981208a465/src/types.ts#L182)

#### Parameters

##### err

`unknown`

##### topic

`string`

#### Returns

`void`

***

### sequential?

> `readonly` `optional` **sequential**: `boolean`

Defined in: [types.ts:183](https://github.com/orkestrel/core/blob/7cc3e19bc4a1e6f96f153d7b931686981208a465/src/types.ts#L183)
