[**@orkestrel/core**](../index.md)

***

# Interface: DiagnosticPort

Defined in: [types.ts:141](https://github.com/orkestrel/core/blob/076093e61b67cd3d4198b173439f047ddbc97abc/src/types.ts#L141)

## Methods

### aggregate()

> **aggregate**(`key`, `details`, `context?`): `never`

Defined in: [types.ts:145](https://github.com/orkestrel/core/blob/076093e61b67cd3d4198b173439f047ddbc97abc/src/types.ts#L145)

#### Parameters

##### key

`string`

##### details

readonly (`Error` \| [`LifecycleErrorDetail`](LifecycleErrorDetail.md))[]

##### context?

[`DiagnosticErrorContext`](DiagnosticErrorContext.md) & `object`

#### Returns

`never`

***

### error()

> **error**(`err`, `context?`): `void`

Defined in: [types.ts:143](https://github.com/orkestrel/core/blob/076093e61b67cd3d4198b173439f047ddbc97abc/src/types.ts#L143)

#### Parameters

##### err

`unknown`

##### context?

[`DiagnosticErrorContext`](DiagnosticErrorContext.md)

#### Returns

`void`

***

### event()

> **event**(`name`, `payload?`): `void`

Defined in: [types.ts:149](https://github.com/orkestrel/core/blob/076093e61b67cd3d4198b173439f047ddbc97abc/src/types.ts#L149)

#### Parameters

##### name

`string`

##### payload?

`Record`\<`string`, `unknown`\>

#### Returns

`void`

***

### fail()

> **fail**(`key`, `context?`): `never`

Defined in: [types.ts:144](https://github.com/orkestrel/core/blob/076093e61b67cd3d4198b173439f047ddbc97abc/src/types.ts#L144)

#### Parameters

##### key

`string`

##### context?

[`DiagnosticErrorContext`](DiagnosticErrorContext.md) & `object`

#### Returns

`never`

***

### help()

> **help**(`key`, `context?`): `Error`

Defined in: [types.ts:146](https://github.com/orkestrel/core/blob/076093e61b67cd3d4198b173439f047ddbc97abc/src/types.ts#L146)

#### Parameters

##### key

`string`

##### context?

[`DiagnosticErrorContext`](DiagnosticErrorContext.md) & `object`

#### Returns

`Error`

***

### log()

> **log**(`level`, `message`, `fields?`): `void`

Defined in: [types.ts:142](https://github.com/orkestrel/core/blob/076093e61b67cd3d4198b173439f047ddbc97abc/src/types.ts#L142)

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

### metric()

> **metric**(`name`, `value`, `tags?`): `void`

Defined in: [types.ts:147](https://github.com/orkestrel/core/blob/076093e61b67cd3d4198b173439f047ddbc97abc/src/types.ts#L147)

#### Parameters

##### name

`string`

##### value

`number`

##### tags?

`Record`\<`string`, `string` \| `number` \| `boolean`\>

#### Returns

`void`

***

### trace()

> **trace**(`name`, `payload?`): `void`

Defined in: [types.ts:148](https://github.com/orkestrel/core/blob/076093e61b67cd3d4198b173439f047ddbc97abc/src/types.ts#L148)

#### Parameters

##### name

`string`

##### payload?

`Record`\<`string`, `unknown`\>

#### Returns

`void`
