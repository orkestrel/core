[**@orkestrel/core**](../index.md)

***

# Class: Orchestrator

Defined in: [orchestrator.ts:79](https://github.com/orkestrel/core/blob/cbe5b2d7b027ca6f0f1301ef32750afb69b4764b/src/orchestrator.ts#L79)

Deterministic lifecycle runner that starts, stops, and destroys components in dependency order.

Responsibilities
- Validates dependency graphs (unknown dependencies and cycles are rejected).
- Guards providers to ensure synchronous creation (no async factories/values).
- Executes lifecycle phases in topological layers with optional concurrency and per-phase timeouts.
- Aggregates failures per phase with stable diagnostic codes.
- Supports telemetry via events and an optional tracer.

## Example

```ts
import { Orchestrator, Container, Adapter, createToken, register } from '@orkestrel/core'

class A extends Adapter {}
class B extends Adapter {}
const TA = createToken<A>('A')
const TB = createToken<B>('B')

const c = new Container()
const app = new Orchestrator(c)
await app.start([
  register(TA, { useFactory: () => new A() }),
  register(TB, { useFactory: () => new B() }, { dependencies: [TA] }),
])
await app.destroy()
```

## Constructors

### Constructor

> **new Orchestrator**(`containerOrOpts?`, `maybeOpts?`): `Orchestrator`

Defined in: [orchestrator.ts:102](https://github.com/orkestrel/core/blob/cbe5b2d7b027ca6f0f1301ef32750afb69b4764b/src/orchestrator.ts#L102)

Construct an Orchestrator bound to a container and optional runtime ports.

You can either pass an existing Container, or pass options to construct with a new internal Container using
the same logger/diagnostic by default, or provide both.

#### Parameters

##### containerOrOpts?

A Container instance to bind, or OrchestratorOptions to construct a new one.

[`Container`](Container.md) | [`OrchestratorOptions`](../interfaces/OrchestratorOptions.md)

##### maybeOpts?

[`OrchestratorOptions`](../interfaces/OrchestratorOptions.md)

Optional OrchestratorOptions when the first argument is a Container.

#### Returns

`Orchestrator`

A new Orchestrator instance configured with provided or default ports.

## Accessors

### container

#### Get Signature

> **get** **container**(): [`Container`](Container.md)

Defined in: [orchestrator.ts:131](https://github.com/orkestrel/core/blob/cbe5b2d7b027ca6f0f1301ef32750afb69b4764b/src/orchestrator.ts#L131)

Access the underlying Container bound to this orchestrator.

##### Returns

[`Container`](Container.md)

The Container used for provider registration and resolution.

***

### diagnostic

#### Get Signature

> **get** **diagnostic**(): [`DiagnosticPort`](../interfaces/DiagnosticPort.md)

Defined in: [orchestrator.ts:159](https://github.com/orkestrel/core/blob/cbe5b2d7b027ca6f0f1301ef32750afb69b4764b/src/orchestrator.ts#L159)

Access the diagnostic port for logging, metrics, traces, and errors.

##### Returns

[`DiagnosticPort`](../interfaces/DiagnosticPort.md)

The DiagnosticPort for telemetry and error reporting.

***

### layer

#### Get Signature

> **get** **layer**(): [`LayerPort`](../interfaces/LayerPort.md)

Defined in: [orchestrator.ts:138](https://github.com/orkestrel/core/blob/cbe5b2d7b027ca6f0f1301ef32750afb69b4764b/src/orchestrator.ts#L138)

Access the layering adapter used to compute dependency layers.

##### Returns

[`LayerPort`](../interfaces/LayerPort.md)

The LayerPort responsible for computing and grouping layers.

***

### logger

#### Get Signature

> **get** **logger**(): [`LoggerPort`](../interfaces/LoggerPort.md)

Defined in: [orchestrator.ts:152](https://github.com/orkestrel/core/blob/cbe5b2d7b027ca6f0f1301ef32750afb69b4764b/src/orchestrator.ts#L152)

Access the logger port in use (propagated to internal adapters when not provided).

##### Returns

[`LoggerPort`](../interfaces/LoggerPort.md)

The LoggerPort for logging messages.

***

### queue

#### Get Signature

> **get** **queue**(): [`QueuePort`](../interfaces/QueuePort.md)

Defined in: [orchestrator.ts:145](https://github.com/orkestrel/core/blob/cbe5b2d7b027ca6f0f1301ef32750afb69b4764b/src/orchestrator.ts#L145)

Access the queue adapter used to run per-layer jobs with optional concurrency.

##### Returns

[`QueuePort`](../interfaces/QueuePort.md)

The QueuePort used to schedule and execute tasks.

## Methods

### destroy()

> **destroy**(): `Promise`\<`void`\>

Defined in: [orchestrator.ts:327](https://github.com/orkestrel/core/blob/cbe5b2d7b027ca6f0f1301ef32750afb69b4764b/src/orchestrator.ts#L327)

Stop (when needed) and destroy all components, then destroy the container.
Aggregates ORK1017 on failure and includes container cleanup errors.

#### Returns

`Promise`\<`void`\>

A promise that resolves when all components and the container are destroyed.

#### Example

```ts
await app.destroy() // ensures stop then destroy for all Lifecycle components
```

***

### register()

> **register**\<`T`\>(`token`, `provider`, `dependencies`, `timeouts?`): `void`

Defined in: [orchestrator.ts:177](https://github.com/orkestrel/core/blob/cbe5b2d7b027ca6f0f1301ef32750afb69b4764b/src/orchestrator.ts#L177)

Register a component provider with optional explicit dependencies/timeouts.
Throws on duplicate registrations or async provider shapes.

#### Type Parameters

##### T

`T`

Token value type.

#### Parameters

##### token

[`Token`](../type-aliases/Token.md)\<`T`\>

Component token to register.

##### provider

[`Provider`](../type-aliases/Provider.md)\<`T`\>

Provider implementation (value/factory/class).

##### dependencies

readonly [`Token`](../type-aliases/Token.md)\<`unknown`\>[] = `[]`

Tokens this component depends on (topological order).

##### timeouts?

`Readonly`\<\{ `onDestroy?`: `number`; `onStart?`: `number`; `onStop?`: `number`; \}\>

Per-component timeouts (number for all phases, or per-phase object).

#### Returns

`void`

Nothing. Registers the provider into the underlying container.

#### Example

```ts
app.register(TOKEN, { useFactory: () => new MyAdapter() }, [DEP1, DEP2], { onStart: 1000 })
```

***

### start()

> **start**(`regs`): `Promise`\<`void`\>

Defined in: [orchestrator.ts:211](https://github.com/orkestrel/core/blob/cbe5b2d7b027ca6f0f1301ef32750afb69b4764b/src/orchestrator.ts#L211)

Start all components in dependency order.

- Optionally provides additional registration entries to register and start in one call.
- On failure, previously started components are rolled back (stopped) in reverse order.
- Aggregates errors with code ORK1013.

#### Parameters

##### regs

readonly [`OrchestratorRegistration`](../interfaces/OrchestratorRegistration.md)\<`unknown`\>[] = `[]`

Optional registration entries to register before starting.

#### Returns

`Promise`\<`void`\>

A promise that resolves when all start jobs complete or rejects with an aggregated error.

#### Example

```ts
const app = new Orchestrator(new Container())
await app.start()
// or start with registrations
await app.start([
  register(TOKEN, { useClass: Impl }),
])
```

***

### stop()

> **stop**(): `Promise`\<`void`\>

Defined in: [orchestrator.ts:294](https://github.com/orkestrel/core/blob/cbe5b2d7b027ca6f0f1301ef32750afb69b4764b/src/orchestrator.ts#L294)

Stop started components in reverse dependency order.
Aggregates ORK1014 on failure.

#### Returns

`Promise`\<`void`\>

A promise that resolves when stop completes across all components.

#### Example

```ts
const app = new Orchestrator(new Container())
await app.stop()
```
