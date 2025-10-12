[**@orkestrel/core**](../index.md)

***

# Class: FakeLogger

Defined in: [adapters/logger.ts:223](https://github.com/orkestrel/core/blob/ccb170966790f428093f11a71a5646a6e842dbf9/src/adapters/logger.ts#L223)

Lightweight in-memory logger intended for tests.

Implements the `LoggerPort` interface and captures log entries in-memory so
unit tests can assert on messages, levels and structured fields. This helper
mirrors the public surface of `LoggerAdapter` but is not intended for
production use.

## Example

```ts
const lg = new FakeLogger()
lg.info('started', { env: 'test' })
// assert on captured entries
expect(lg.entries[0]).toMatchObject({ level: 'info', message: 'started', fields: { env: 'test' } })
```

## Implements

- [`LoggerPort`](../interfaces/LoggerPort.md)

## Constructors

### Constructor

> **new FakeLogger**(): `FakeLogger`

#### Returns

`FakeLogger`

## Properties

### entries

> **entries**: `object`[] = `[]`

Defined in: [adapters/logger.ts:224](https://github.com/orkestrel/core/blob/ccb170966790f428093f11a71a5646a6e842dbf9/src/adapters/logger.ts#L224)

#### fields?

> `optional` **fields**: `Record`\<`string`, `unknown`\>

#### level

> **level**: [`LogLevel`](../type-aliases/LogLevel.md)

#### message

> **message**: `string`

## Methods

### debug()

> **debug**(`message`, `payload?`): `void`

Defined in: [adapters/logger.ts:238](https://github.com/orkestrel/core/blob/ccb170966790f428093f11a71a5646a6e842dbf9/src/adapters/logger.ts#L238)

Capture a debug-level entry.

#### Parameters

##### message

`string`

Human readable message

##### payload?

`unknown`

Optional structured payload or extra args

#### Returns

`void`

void

#### Example

```ts
const lg = new FakeLogger()
lg.debug('verbose', { key: 'value' })
```

#### Implementation of

[`LoggerPort`](../interfaces/LoggerPort.md).[`debug`](../interfaces/LoggerPort.md#debug)

***

### error()

> **error**(`message`, `payload?`): `void`

Defined in: [adapters/logger.ts:280](https://github.com/orkestrel/core/blob/ccb170966790f428093f11a71a5646a6e842dbf9/src/adapters/logger.ts#L280)

Capture an error-level entry.

#### Parameters

##### message

`string`

Human readable message

##### payload?

`unknown`

Optional structured payload or extra args

#### Returns

`void`

void

#### Example

```ts
const lg = new FakeLogger()
lg.error('failed', { err: new Error('boom') })
```

#### Implementation of

[`LoggerPort`](../interfaces/LoggerPort.md).[`error`](../interfaces/LoggerPort.md#error)

***

### info()

> **info**(`message`, `payload?`): `void`

Defined in: [adapters/logger.ts:252](https://github.com/orkestrel/core/blob/ccb170966790f428093f11a71a5646a6e842dbf9/src/adapters/logger.ts#L252)

Capture an info-level entry.

#### Parameters

##### message

`string`

Human readable message

##### payload?

`unknown`

Optional structured payload or extra args

#### Returns

`void`

void

#### Example

```ts
const lg = new FakeLogger()
lg.info('started', { env: 'test' })
```

#### Implementation of

[`LoggerPort`](../interfaces/LoggerPort.md).[`info`](../interfaces/LoggerPort.md#info)

***

### log()

> **log**(`level`, `message`, `fields?`): `void`

Defined in: [adapters/logger.ts:295](https://github.com/orkestrel/core/blob/ccb170966790f428093f11a71a5646a6e842dbf9/src/adapters/logger.ts#L295)

Compatibility log method.

#### Parameters

##### level

[`LogLevel`](../type-aliases/LogLevel.md)

Log level

##### message

`string`

Human readable message

##### fields?

`Record`\<`string`, `unknown`\>

Optional structured fields

#### Returns

`void`

void

#### Example

```ts
const lg = new FakeLogger()
lg.log('info', 'app.started', { version: '1.0' })
```

#### Implementation of

[`LoggerPort`](../interfaces/LoggerPort.md).[`log`](../interfaces/LoggerPort.md#log)

***

### warn()

> **warn**(`message`, `payload?`): `void`

Defined in: [adapters/logger.ts:266](https://github.com/orkestrel/core/blob/ccb170966790f428093f11a71a5646a6e842dbf9/src/adapters/logger.ts#L266)

Capture a warn-level entry.

#### Parameters

##### message

`string`

Human readable message

##### payload?

`unknown`

Optional structured payload or extra args

#### Returns

`void`

void

#### Example

```ts
const lg = new FakeLogger()
lg.warn('slow-response', { ms: 123 })
```

#### Implementation of

[`LoggerPort`](../interfaces/LoggerPort.md).[`warn`](../interfaces/LoggerPort.md#warn)
