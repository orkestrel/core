[**@orkestrel/core**](../index.md)

***

# Interface: EventAdapterOptions

Defined in: [types.ts:180](https://github.com/orkestrel/core/blob/240d6e1612057b96fd3fc03e1415fe3917a0f212/src/types.ts#L180)

## Properties

### diagnostic?

> `readonly` `optional` **diagnostic**: [`DiagnosticPort`](DiagnosticPort.md)

Defined in: [types.ts:184](https://github.com/orkestrel/core/blob/240d6e1612057b96fd3fc03e1415fe3917a0f212/src/types.ts#L184)

***

### logger?

> `readonly` `optional` **logger**: [`LoggerPort`](LoggerPort.md)

Defined in: [types.ts:183](https://github.com/orkestrel/core/blob/240d6e1612057b96fd3fc03e1415fe3917a0f212/src/types.ts#L183)

***

### onError()?

> `readonly` `optional` **onError**: (`err`, `topic`) => `void`

Defined in: [types.ts:181](https://github.com/orkestrel/core/blob/240d6e1612057b96fd3fc03e1415fe3917a0f212/src/types.ts#L181)

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

Defined in: [types.ts:182](https://github.com/orkestrel/core/blob/240d6e1612057b96fd3fc03e1415fe3917a0f212/src/types.ts#L182)
