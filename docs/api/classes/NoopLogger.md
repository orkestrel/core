[**@orkestrel/core**](../index.md)

***

# Class: NoopLogger

Defined in: [adapters/logger.ts:143](https://github.com/orkestrel/core/blob/ccb170966790f428093f11a71a5646a6e842dbf9/src/adapters/logger.ts#L143)

No-op logger that discards messages and exposes the same shape as LoggerAdapter.

## Example

```ts
const n = new NoopLogger(); n.info('x')
```

## Implements

- [`LoggerPort`](../interfaces/LoggerPort.md)

## Constructors

### Constructor

> **new NoopLogger**(): `NoopLogger`

#### Returns

`NoopLogger`

## Methods

### debug()

> **debug**(`_message`, ...`_args`): `void`

Defined in: [adapters/logger.ts:155](https://github.com/orkestrel/core/blob/ccb170966790f428093f11a71a5646a6e842dbf9/src/adapters/logger.ts#L155)

No-op debug method.

#### Parameters

##### \_message

`string`

ignored

##### \_args

...`unknown`[]

ignored

#### Returns

`void`

void

#### Example

```ts
new NoopLogger().debug('x')
```

#### Implementation of

[`LoggerPort`](../interfaces/LoggerPort.md).[`debug`](../interfaces/LoggerPort.md#debug)

***

### error()

> **error**(`_message`, ...`_args`): `void`

Defined in: [adapters/logger.ts:191](https://github.com/orkestrel/core/blob/ccb170966790f428093f11a71a5646a6e842dbf9/src/adapters/logger.ts#L191)

No-op error method.

#### Parameters

##### \_message

`string`

ignored

##### \_args

...`unknown`[]

ignored

#### Returns

`void`

void

#### Example

```ts
new NoopLogger().error('x')
```

#### Implementation of

[`LoggerPort`](../interfaces/LoggerPort.md).[`error`](../interfaces/LoggerPort.md#error)

***

### info()

> **info**(`_message`, ...`_args`): `void`

Defined in: [adapters/logger.ts:167](https://github.com/orkestrel/core/blob/ccb170966790f428093f11a71a5646a6e842dbf9/src/adapters/logger.ts#L167)

No-op info method.

#### Parameters

##### \_message

`string`

ignored

##### \_args

...`unknown`[]

ignored

#### Returns

`void`

void

#### Example

```ts
new NoopLogger().info('x')
```

#### Implementation of

[`LoggerPort`](../interfaces/LoggerPort.md).[`info`](../interfaces/LoggerPort.md#info)

***

### log()

> **log**(`_level`, `_message`, `_fields?`): `void`

Defined in: [adapters/logger.ts:204](https://github.com/orkestrel/core/blob/ccb170966790f428093f11a71a5646a6e842dbf9/src/adapters/logger.ts#L204)

No-op generic log method.

#### Parameters

##### \_level

[`LogLevel`](../type-aliases/LogLevel.md)

ignored

##### \_message

`string`

ignored

##### \_fields?

`Record`\<`string`, `unknown`\>

ignored

#### Returns

`void`

void

#### Example

```ts
new NoopLogger().log('info', 'x')
```

#### Implementation of

[`LoggerPort`](../interfaces/LoggerPort.md).[`log`](../interfaces/LoggerPort.md#log)

***

### warn()

> **warn**(`_message`, ...`_args`): `void`

Defined in: [adapters/logger.ts:179](https://github.com/orkestrel/core/blob/ccb170966790f428093f11a71a5646a6e842dbf9/src/adapters/logger.ts#L179)

No-op warn method.

#### Parameters

##### \_message

`string`

ignored

##### \_args

...`unknown`[]

ignored

#### Returns

`void`

void

#### Example

```ts
new NoopLogger().warn('x')
```

#### Implementation of

[`LoggerPort`](../interfaces/LoggerPort.md).[`warn`](../interfaces/LoggerPort.md#warn)
