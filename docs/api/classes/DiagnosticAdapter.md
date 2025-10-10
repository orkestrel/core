[**@orkestrel/core**](../index.md)

***

# Class: DiagnosticAdapter

Defined in: [adapters/diagnostic.ts:67](https://github.com/orkestrel/core/blob/4aab0d299da5f30a0c75f3eda95d1b02f821688d/src/adapters/diagnostic.ts#L67)

Diagnostic adapter providing safe logging, error reporting, and telemetry.

Acts as a delegator to a LoggerPort with keyed message overrides for consistent
log levels and messages. Provides methods for logging (log), error reporting (error),
error construction and throwing (fail), building errors without throwing (help),
aggregating lifecycle errors (aggregate), and telemetry (metric/trace/event).

Never throws from safe methods (log, error, metric, trace, event). Only fail() and
aggregate() throw errors after logging them.

## Example

```ts
import { DiagnosticAdapter, ORCHESTRATOR_MESSAGES } from '@orkestrel/core'

const diag = new DiagnosticAdapter({ messages: ORCHESTRATOR_MESSAGES })
diag.log('info', 'orchestrator.phase', { phase: 'start' })

// Build and throw an error with a code
try {
  diag.fail('ORK1007', { scope: 'orchestrator', message: 'Duplicate registration' })
} catch (e) {
  console.error('Caught:', (e as any).code, (e as Error).message)
}

// Aggregate multiple errors
const errors = [new Error('task1 failed'), new Error('task2 failed')]
try {
  diag.aggregate('ORK1017', errors, { scope: 'orchestrator', message: 'Errors during destroy' })
} catch (e) {
  // e is an AggregateLifecycleError with .details and .errors
}
```

## Implements

- [`DiagnosticPort`](../interfaces/DiagnosticPort.md)

## Constructors

### Constructor

> **new DiagnosticAdapter**(`options?`): `DiagnosticAdapter`

Defined in: [adapters/diagnostic.ts:79](https://github.com/orkestrel/core/blob/4aab0d299da5f30a0c75f3eda95d1b02f821688d/src/adapters/diagnostic.ts#L79)

Construct a DiagnosticAdapter with optional logger and message overrides.

#### Parameters

##### options?

[`DiagnosticAdapterOptions`](../interfaces/DiagnosticAdapterOptions.md)

Configuration options:
- logger: Optional logger port for emitting log entries (default: LoggerAdapter)
- messages: Array of diagnostic messages with keys, levels, and message templates
   *

#### Returns

`DiagnosticAdapter`

## Accessors

### logger

#### Get Signature

> **get** **logger**(): [`LoggerPort`](../interfaces/LoggerPort.md)

Defined in: [adapters/diagnostic.ts:91](https://github.com/orkestrel/core/blob/4aab0d299da5f30a0c75f3eda95d1b02f821688d/src/adapters/diagnostic.ts#L91)

Access the logger port used by this diagnostic adapter.

##### Returns

[`LoggerPort`](../interfaces/LoggerPort.md)

The configured LoggerPort instance

## Methods

### aggregate()

> **aggregate**(`key`, `errors`, `context`): `never`

Defined in: [adapters/diagnostic.ts:184](https://github.com/orkestrel/core/blob/4aab0d299da5f30a0c75f3eda95d1b02f821688d/src/adapters/diagnostic.ts#L184)

Aggregate multiple errors into a single structured AggregateDiagnosticError and throw it.

#### Parameters

##### key

`string`

Code used to identify the aggregate error (e.g., 'ORK1016')

##### errors

readonly (`Error` \| [`LifecycleErrorDetail`](../interfaces/LifecycleErrorDetail.md))[]

Array of Error instances to aggregate (or already-normalized details)

##### context

[`DiagnosticErrorContext`](../interfaces/DiagnosticErrorContext.md) & `object` = `{}`

Optional structured context including scope, message, helpUrl, and name

#### Returns

`never`

#### Throws

AggregateDiagnosticError containing details and errors

#### Example

```ts
const errs = [new Error('A'), new Error('B')]
diag.aggregate('ORK1017', errs, { scope: 'orchestrator' })
```

#### Implementation of

[`DiagnosticPort`](../interfaces/DiagnosticPort.md).[`aggregate`](../interfaces/DiagnosticPort.md#aggregate)

***

### error()

> **error**(`err`, `context`): `void`

Defined in: [adapters/diagnostic.ts:123](https://github.com/orkestrel/core/blob/4aab0d299da5f30a0c75f3eda95d1b02f821688d/src/adapters/diagnostic.ts#L123)

Report an error to the logger with optional context fields.

#### Parameters

##### err

`unknown`

Error instance or value to report

##### context

[`DiagnosticErrorContext`](../interfaces/DiagnosticErrorContext.md) = `{}`

Optional structured context including code, scope, and extra fields

#### Returns

`void`

void (reports the error safely)
   *

#### Example

```ts
diag.error(new Error('boom'), { scope: 'orchestrator', code: 'ORK1013' })
```

#### Implementation of

[`DiagnosticPort`](../interfaces/DiagnosticPort.md).[`error`](../interfaces/DiagnosticPort.md#error)

***

### event()

> **event**(`name`, `payload?`): `void`

Defined in: [adapters/diagnostic.ts:242](https://github.com/orkestrel/core/blob/4aab0d299da5f30a0c75f3eda95d1b02f821688d/src/adapters/diagnostic.ts#L242)

Emit a telemetry event with a name and payload.

#### Parameters

##### name

`string`

Event name (e.g., 'lifecycle.transition')

##### payload?

`Record`\<`string`, `unknown`\>

Arbitrary event payload
   *

#### Returns

`void`

void (emits an event entry)
   *

#### Example

```ts
diag.event('orchestrator.component.start', { token: 'Database' })
```

#### Implementation of

[`DiagnosticPort`](../interfaces/DiagnosticPort.md).[`event`](../interfaces/DiagnosticPort.md#event)

***

### fail()

> **fail**(`key`, `context`): `never`

Defined in: [adapters/diagnostic.ts:142](https://github.com/orkestrel/core/blob/4aab0d299da5f30a0c75f3eda95d1b02f821688d/src/adapters/diagnostic.ts#L142)

Build an Error using a key/code, log it, and throw it.

#### Parameters

##### key

`string`

Code or message key (e.g., 'ORK1007') used to resolve message and severity

##### context

[`DiagnosticErrorContext`](../interfaces/DiagnosticErrorContext.md) & `object` = `{}`

Optional structured context including message override, helpUrl, name, and scope

#### Returns

`never`

#### Throws

Error with optional .code and .helpUrl properties
   *

#### Example

```ts
diag.fail('ORK1007', { scope: 'orchestrator', message: 'Duplicate registration' })
```

#### Implementation of

[`DiagnosticPort`](../interfaces/DiagnosticPort.md).[`fail`](../interfaces/DiagnosticPort.md#fail)

***

### help()

> **help**(`key`, `context`): `Error`

Defined in: [adapters/diagnostic.ts:164](https://github.com/orkestrel/core/blob/4aab0d299da5f30a0c75f3eda95d1b02f821688d/src/adapters/diagnostic.ts#L164)

Build an Error using a key/code and return it (without throwing).

#### Parameters

##### key

`string`

Code or message key (e.g., 'ORK1010') used to resolve message and severity

##### context

[`DiagnosticErrorContext`](../interfaces/DiagnosticErrorContext.md) & `object` = `{}`

Optional structured context including message override, helpUrl, name, and scope

#### Returns

`Error`

The constructed Error instance
   *

#### Example

```ts
const timeoutErr = diag.help('ORK1021', { message: 'Hook onStart timed out' })
```

#### Implementation of

[`DiagnosticPort`](../interfaces/DiagnosticPort.md).[`help`](../interfaces/DiagnosticPort.md#help)

***

### log()

> **log**(`level`, `message`, `fields?`): `void`

Defined in: [adapters/diagnostic.ts:106](https://github.com/orkestrel/core/blob/4aab0d299da5f30a0c75f3eda95d1b02f821688d/src/adapters/diagnostic.ts#L106)

Write a log entry with a level, message key, and optional structured fields.

#### Parameters

##### level

[`LogLevel`](../type-aliases/LogLevel.md)

Fallback log level when the key is not found in the message map

##### message

`string`

Message key or literal message string

##### fields?

`Record`\<`string`, `unknown`\>

Optional structured data to include with the log entry

#### Returns

`void`

void (logs the message if possible)
   *

#### Example

```ts
diag.log('info', 'orchestrator.phase', { phase: 'start', layer: 1 })
```

#### Implementation of

[`DiagnosticPort`](../interfaces/DiagnosticPort.md).[`log`](../interfaces/DiagnosticPort.md#log)

***

### metric()

> **metric**(`name`, `value`, `tags?`): `void`

Defined in: [adapters/diagnostic.ts:207](https://github.com/orkestrel/core/blob/4aab0d299da5f30a0c75f3eda95d1b02f821688d/src/adapters/diagnostic.ts#L207)

Emit a metric with a numeric value and optional tags.

#### Parameters

##### name

`string`

Metric name (e.g., 'queue.size')

##### value

`number`

Numeric value to record

##### tags?

`Record`\<`string`, `string` \| `number` \| `boolean`\>

Optional tags to include with the metric

   *

#### Returns

`void`

#### Example

```ts
diag.metric('queue.size', 42, { queueName: 'tasks' })
```

#### Implementation of

[`DiagnosticPort`](../interfaces/DiagnosticPort.md).[`metric`](../interfaces/DiagnosticPort.md#metric)

***

### trace()

> **trace**(`name`, `payload?`): `void`

Defined in: [adapters/diagnostic.ts:225](https://github.com/orkestrel/core/blob/4aab0d299da5f30a0c75f3eda95d1b02f821688d/src/adapters/diagnostic.ts#L225)

Emit a trace span with a name and optional fields.

#### Parameters

##### name

`string`

Span name (e.g., 'orchestrator.start')

##### payload?

`Record`\<`string`, `unknown`\>

Optional structured fields for the trace

#### Returns

`void`

void (emits a trace entry)
   *

#### Example

```ts
diag.trace('lifecycle.transition', { from: 'created', to: 'started' })
```

#### Implementation of

[`DiagnosticPort`](../interfaces/DiagnosticPort.md).[`trace`](../interfaces/DiagnosticPort.md#trace)
