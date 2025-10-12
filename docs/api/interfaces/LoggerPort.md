[**@orkestrel/core**](../index.md)

***

# Interface: LoggerPort

Defined in: [types.ts:105](https://github.com/orkestrel/core/blob/ccb170966790f428093f11a71a5646a6e842dbf9/src/types.ts#L105)

## Methods

### debug()

> **debug**(`message`, ...`args`): `void`

Defined in: [types.ts:106](https://github.com/orkestrel/core/blob/ccb170966790f428093f11a71a5646a6e842dbf9/src/types.ts#L106)

#### Parameters

##### message

`string`

##### args

...`unknown`[]

#### Returns

`void`

***

### error()

> **error**(`message`, ...`args`): `void`

Defined in: [types.ts:109](https://github.com/orkestrel/core/blob/ccb170966790f428093f11a71a5646a6e842dbf9/src/types.ts#L109)

#### Parameters

##### message

`string`

##### args

...`unknown`[]

#### Returns

`void`

***

### info()

> **info**(`message`, ...`args`): `void`

Defined in: [types.ts:107](https://github.com/orkestrel/core/blob/ccb170966790f428093f11a71a5646a6e842dbf9/src/types.ts#L107)

#### Parameters

##### message

`string`

##### args

...`unknown`[]

#### Returns

`void`

***

### log()

> **log**(`level`, `message`, `fields?`): `void`

Defined in: [types.ts:110](https://github.com/orkestrel/core/blob/ccb170966790f428093f11a71a5646a6e842dbf9/src/types.ts#L110)

#### Parameters

##### level

[`LogLevel`](../type-aliases/LogLevel.md)

##### message

`string`

##### fields?

`Record`\<`string`, `unknown`\>

#### Returns

`void`

***

### warn()

> **warn**(`message`, ...`args`): `void`

Defined in: [types.ts:108](https://github.com/orkestrel/core/blob/ccb170966790f428093f11a71a5646a6e842dbf9/src/types.ts#L108)

#### Parameters

##### message

`string`

##### args

...`unknown`[]

#### Returns

`void`
