[**@orkestrel/core**](../index.md)

***

# Class: NoopLogger

Defined in: [adapters/logger.ts:57](https://github.com/orkestrel/core/blob/98df1af1b029ad0f39e413b90869151f4152e5dd/src/adapters/logger.ts#L57)

Silent logger implementation that discards all log messages.

Useful for tests or when you need to disable logging entirely without changing code.

## Example

```ts
import { NoopLogger } from '@orkestrel/core'
const logger = new NoopLogger()
logger.log('info', 'This will not be logged')
```

## Implements

- [`LoggerPort`](../interfaces/LoggerPort.md)

## Constructors

### Constructor

> **new NoopLogger**(): `NoopLogger`

#### Returns

`NoopLogger`

## Methods

### log()

> **log**(`_level`, `_message`, `_fields?`): `void`

Defined in: [adapters/logger.ts:72](https://github.com/orkestrel/core/blob/98df1af1b029ad0f39e413b90869151f4152e5dd/src/adapters/logger.ts#L72)

No-op log method that intentionally does nothing with log messages.

#### Parameters

##### \_level

[`LogLevel`](../type-aliases/LogLevel.md)

Log level (ignored)

##### \_message

`string`

Log message (ignored)

##### \_fields?

`Record`\<`string`, `unknown`\>

Optional fields (ignored)

#### Returns

`void`

void

#### Example

```ts
const logger = new NoopLogger()
logger.log('warn', 'dropped')
```

#### Implementation of

[`LoggerPort`](../interfaces/LoggerPort.md).[`log`](../interfaces/LoggerPort.md#log)
