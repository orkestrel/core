[**@orkestrel/core**](../index.md)

***

# Class: LoggerAdapter

Defined in: [adapters/logger.ts:19](https://github.com/orkestrel/core/blob/cbe5b2d7b027ca6f0f1301ef32750afb69b4764b/src/adapters/logger.ts#L19)

Console-like logger adapter.

Provides per-level methods (debug, info, warn, error) similar to console,
plus a compatibility `log(level, message, fields?)` method.

All methods accept a message string and optional args. When the first extra
arg is an object it will be treated as structured fields and logged along
with the message.

## Example

```ts
const lg = new LoggerAdapter()
lg.info('started', { env: 'dev' })
```

## Implements

- [`LoggerPort`](../interfaces/LoggerPort.md)

## Constructors

### Constructor

> **new LoggerAdapter**(): `LoggerAdapter`

#### Returns

`LoggerAdapter`

## Methods

### debug()

> **debug**(`message`, ...`args`): `void`

Defined in: [adapters/logger.ts:33](https://github.com/orkestrel/core/blob/cbe5b2d7b027ca6f0f1301ef32750afb69b4764b/src/adapters/logger.ts#L33)

Debug-level log.

A short debug message; additional args may include a fields object.

#### Parameters

##### message

`string`

Human readable message to log

##### args

...`unknown`[]

Optional extra arguments or a fields object

#### Returns

`void`

void

#### Example

```ts
logger.debug('initialized', { port: 3000 })
```

#### Implementation of

[`LoggerPort`](../interfaces/LoggerPort.md).[`debug`](../interfaces/LoggerPort.md#debug)

***

### error()

> **error**(`message`, ...`args`): `void`

Defined in: [adapters/logger.ts:85](https://github.com/orkestrel/core/blob/cbe5b2d7b027ca6f0f1301ef32750afb69b4764b/src/adapters/logger.ts#L85)

Error-level log.

#### Parameters

##### message

`string`

Human readable message to log

##### args

...`unknown`[]

Optional extra arguments or a fields object

#### Returns

`void`

void

#### Example

```ts
logger.error('failed', { err })
```

#### Implementation of

[`LoggerPort`](../interfaces/LoggerPort.md).[`error`](../interfaces/LoggerPort.md#error)

***

### info()

> **info**(`message`, ...`args`): `void`

Defined in: [adapters/logger.ts:51](https://github.com/orkestrel/core/blob/cbe5b2d7b027ca6f0f1301ef32750afb69b4764b/src/adapters/logger.ts#L51)

Info-level log.

Informational message for normal operations.

#### Parameters

##### message

`string`

Human readable message to log

##### args

...`unknown`[]

Optional extra arguments or a fields object

#### Returns

`void`

void

#### Example

```ts
logger.info('listening', { host: '0.0.0.0' })
```

#### Implementation of

[`LoggerPort`](../interfaces/LoggerPort.md).[`info`](../interfaces/LoggerPort.md#info)

***

### log()

> **log**(`level`, `message`, `fields`): `void`

Defined in: [adapters/logger.ts:103](https://github.com/orkestrel/core/blob/cbe5b2d7b027ca6f0f1301ef32750afb69b4764b/src/adapters/logger.ts#L103)

Generic log method for compatibility with LoggerPort interface. The
optional fields parameter is supported for existing callers.

#### Parameters

##### level

[`LogLevel`](../type-aliases/LogLevel.md)

Log level to use

##### message

`string`

Message to log

##### fields

`Record`\<`string`, `unknown`\> = `{}`

Optional structured fields object

#### Returns

`void`

void

#### Example

```ts
logger.log('info', 'app.started', { version: '1.0' })
```

#### Implementation of

[`LoggerPort`](../interfaces/LoggerPort.md).[`log`](../interfaces/LoggerPort.md#log)

***

### warn()

> **warn**(`message`, ...`args`): `void`

Defined in: [adapters/logger.ts:69](https://github.com/orkestrel/core/blob/cbe5b2d7b027ca6f0f1301ef32750afb69b4764b/src/adapters/logger.ts#L69)

Warn-level log.

Non-fatal warning indicating a potential issue.

#### Parameters

##### message

`string`

Human readable message to log

##### args

...`unknown`[]

Optional extra arguments or a fields object

#### Returns

`void`

void

#### Example

```ts
logger.warn('slow-response', { ms: 1024 })
```

#### Implementation of

[`LoggerPort`](../interfaces/LoggerPort.md).[`warn`](../interfaces/LoggerPort.md#warn)
