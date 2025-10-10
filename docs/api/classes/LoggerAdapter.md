[**@orkestrel/core**](../index.md)

***

# Class: LoggerAdapter

Defined in: [adapters/logger.ts:17](https://github.com/orkestrel/core/blob/7cc3e19bc4a1e6f96f153d7b931686981208a465/src/adapters/logger.ts#L17)

Minimal console-backed logger implementation that routes log messages by level.

Routes log messages to the appropriate console method based on level (debug/info/warn/error).
Swallows any console errors to avoid cascading failures.

## Example

```ts
import { LoggerAdapter } from '@orkestrel/core'
const logger = new LoggerAdapter()
logger.log('info', 'Application started', { version: '1.0.0', user: 'alice' })
logger.log('error', 'Failed to connect', { retries: 3 })
```

## Implements

- [`LoggerPort`](../interfaces/LoggerPort.md)

## Constructors

### Constructor

> **new LoggerAdapter**(): `LoggerAdapter`

#### Returns

`LoggerAdapter`

## Methods

### log()

> **log**(`level`, `message`, `fields`): `void`

Defined in: [adapters/logger.ts:31](https://github.com/orkestrel/core/blob/7cc3e19bc4a1e6f96f153d7b931686981208a465/src/adapters/logger.ts#L31)

Log a message with the specified level and optional structured fields.

#### Parameters

##### level

[`LogLevel`](../type-aliases/LogLevel.md)

Log level: 'debug', 'info', 'warn', or 'error'

##### message

`string`

Human-readable log message

##### fields

`Record`\<`string`, `unknown`\> = `{}`

Optional structured data to include with the log entry

#### Returns

`void`

void (writes to console methods)

#### Example

```ts
logger.log('info', 'User logged in', { userId: '123', sessionId: 'abc' })
```

#### Implementation of

[`LoggerPort`](../interfaces/LoggerPort.md).[`log`](../interfaces/LoggerPort.md#log)
