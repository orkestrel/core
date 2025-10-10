[**@orkestrel/core**](../index.md)

***

# Class: Container

Defined in: [container.ts:71](https://github.com/orkestrel/core/blob/4aab0d299da5f30a0c75f3eda95d1b02f821688d/src/container.ts#L71)

Minimal, strongly-typed DI container for tokens and providers.

Features
- Register value, factory, or class providers under token keys.
- Resolve single tokens or maps strictly (throws on missing) or optionally (returns undefined).
- Create child scopes that inherit providers; use using() to run scoped work with auto cleanup.
- Destroy lifecycle-owning instances deterministically.

## Example

```ts
import { Container, createToken } from '@orkestrel/core'

const A = createToken<number>('A')
const B = createToken<string>('B')
const C = createToken<{ a: number, b: string }>('C')

const c = new Container()
c.set(A, 1)
c.set(B, 'two')
c.register(C, { useFactory: (a, b) => ({ a, b }), inject: [A, B] })

const merged = c.resolve(C) // { a: 1, b: 'two' }
const { a, b } = c.resolve({ a: A, b: B })

await c.using(async (scope) => {
  // scoped overrides
  scope.set(A, 99)
  const { a: scopedA } = scope.resolve({ a: A }) // 99
  // scope destroyed automatically afterwards
})

await c.destroy() // stops and destroys owned Lifecycle instances
```

## Constructors

### Constructor

> **new Container**(`opts`): `Container`

Defined in: [container.ts:87](https://github.com/orkestrel/core/blob/4aab0d299da5f30a0c75f3eda95d1b02f821688d/src/container.ts#L87)

Construct a Container with optional parent, logger, and diagnostic adapters.

#### Parameters

##### opts

[`ContainerOptions`](../interfaces/ContainerOptions.md) = `{}`

Configuration options:
- parent: Optional parent container to inherit providers from
- logger: Optional logger port for diagnostics
- diagnostic: Optional diagnostic port for error reporting

#### Returns

`Container`

## Accessors

### diagnostic

#### Get Signature

> **get** **diagnostic**(): [`DiagnosticPort`](../interfaces/DiagnosticPort.md)

Defined in: [container.ts:99](https://github.com/orkestrel/core/blob/4aab0d299da5f30a0c75f3eda95d1b02f821688d/src/container.ts#L99)

Access the diagnostic port used by this container.

##### Returns

[`DiagnosticPort`](../interfaces/DiagnosticPort.md)

The configured DiagnosticPort instance

***

### logger

#### Get Signature

> **get** **logger**(): [`LoggerPort`](../interfaces/LoggerPort.md)

Defined in: [container.ts:106](https://github.com/orkestrel/core/blob/4aab0d299da5f30a0c75f3eda95d1b02f821688d/src/container.ts#L106)

Access the logger port used by this container.

##### Returns

[`LoggerPort`](../interfaces/LoggerPort.md)

The configured LoggerPort instance

## Methods

### createChild()

> **createChild**(): `Container`

Defined in: [container.ts:263](https://github.com/orkestrel/core/blob/4aab0d299da5f30a0c75f3eda95d1b02f821688d/src/container.ts#L263)

Create a child container that inherits providers from this container.

#### Returns

`Container`

A new Container instance with this container as its parent

#### Example

```ts
const child = container.createChild()
child.set(OverrideToken, newValue)
```

***

### destroy()

> **destroy**(): `Promise`\<`void`\>

Defined in: [container.ts:318](https://github.com/orkestrel/core/blob/4aab0d299da5f30a0c75f3eda95d1b02f821688d/src/container.ts#L318)

Destroy owned Lifecycle instances (stop if needed, then destroy).

Idempotent - safe to call multiple times. Iterates through all registered instances,
stops any that are started, and destroys all that are disposable.

#### Returns

`Promise`\<`void`\>

#### Throws

AggregateLifecycleError with code ORK1016 if errors occur during destruction

#### Example

```ts
await container.destroy()
```

***

### get()

Optionally resolve a single token or a map of tokens; missing entries return undefined.

#### Param

Token to get, or a record/tuple of tokens to get into a map/tuple

#### Example

```ts
const maybeCfg = container.get(ConfigToken) // T | undefined
const { a, b } = container.get({ a: A, b: B }) // { a?: A, b?: B }
const [a, b] = container.get([A, B] as const) // [A | undefined, B | undefined]
```

#### Call Signature

> **get**\<`T`\>(`token`): `undefined` \| `T`

Defined in: [container.ts:218](https://github.com/orkestrel/core/blob/4aab0d299da5f30a0c75f3eda95d1b02f821688d/src/container.ts#L218)

##### Type Parameters

###### T

`T`

##### Parameters

###### token

[`Token`](../type-aliases/Token.md)\<`T`\>

##### Returns

`undefined` \| `T`

#### Call Signature

> **get**\<`A`\>(`tokens`): \{ \[K in string \| number \| symbol\]: undefined \| A\[K\<K\>\] \}

Defined in: [container.ts:220](https://github.com/orkestrel/core/blob/4aab0d299da5f30a0c75f3eda95d1b02f821688d/src/container.ts#L220)

##### Type Parameters

###### A

`A` *extends* readonly `unknown`[]

##### Parameters

###### tokens

[`InjectTuple`](../type-aliases/InjectTuple.md)\<`A`\>

##### Returns

\{ \[K in string \| number \| symbol\]: undefined \| A\[K\<K\>\] \}

#### Call Signature

> **get**\<`O`\>(`tokens`): \{ \[K in string \| number \| symbol\]: undefined \| O\[K\] \}

Defined in: [container.ts:222](https://github.com/orkestrel/core/blob/4aab0d299da5f30a0c75f3eda95d1b02f821688d/src/container.ts#L222)

##### Type Parameters

###### O

`O` *extends* `Record`\<`string`, `unknown`\>

##### Parameters

###### tokens

[`InjectObject`](../type-aliases/InjectObject.md)\<`O`\>

##### Returns

\{ \[K in string \| number \| symbol\]: undefined \| O\[K\] \}

#### Call Signature

> **get**\<`TMap`\>(`tokens`): [`OptionalResolvedMap`](../type-aliases/OptionalResolvedMap.md)\<`TMap`\>

Defined in: [container.ts:224](https://github.com/orkestrel/core/blob/4aab0d299da5f30a0c75f3eda95d1b02f821688d/src/container.ts#L224)

##### Type Parameters

###### TMap

`TMap` *extends* [`TokenRecord`](../type-aliases/TokenRecord.md)

##### Parameters

###### tokens

`TMap`

##### Returns

[`OptionalResolvedMap`](../type-aliases/OptionalResolvedMap.md)\<`TMap`\>

***

### has()

> **has**\<`T`\>(`token`): `boolean`

Defined in: [container.ts:176](https://github.com/orkestrel/core/blob/4aab0d299da5f30a0c75f3eda95d1b02f821688d/src/container.ts#L176)

Check if a provider is available for the token (searches parent containers).

#### Type Parameters

##### T

`T`

Token value type

#### Parameters

##### token

[`Token`](../type-aliases/Token.md)\<`T`\>

The token to check

#### Returns

`boolean`

True if a provider is registered for the token, false otherwise

#### Example

```ts
if (container.has(ConfigToken)) {
  const config = container.resolve(ConfigToken)
}
```

***

### register()

Register a provider under a token.

Supported shapes
- Value: `{ useValue }`
- Factory: `{ useFactory }` with optional inject tuple/object or container arg
- Class: `{ useClass }` with optional inject tuple/object or container arg

#### Type Param

Token value type.

#### Param

The unique token to associate with the provider.

#### Param

The provider object or raw value.

#### Param

When true, prevents re-registration for the same token.

#### Example

```ts
// value
container.register(Port, { useValue: impl })
// factory with tuple inject
container.register(Port, { useFactory: (a, b) => make(a, b), inject: [A, B] })
// class with object inject
container.register(Port, { useClass: Impl, inject: { a: A, b: B } })
// lock to prevent override
container.register(Port, { useValue: impl }, true)
```

#### Call Signature

> **register**\<`T`, `A`\>(`token`, `provider`, `lock?`): `this`

Defined in: [container.ts:109](https://github.com/orkestrel/core/blob/4aab0d299da5f30a0c75f3eda95d1b02f821688d/src/container.ts#L109)

##### Type Parameters

###### T

`T`

###### A

`A` *extends* readonly `unknown`[]

##### Parameters

###### token

[`Token`](../type-aliases/Token.md)\<`T`\>

###### provider

[`FactoryProviderWithTuple`](../type-aliases/FactoryProviderWithTuple.md)\<`T`, `A`\> | [`ClassProviderWithTuple`](../type-aliases/ClassProviderWithTuple.md)\<`T`, `A`\>

###### lock?

`boolean`

##### Returns

`this`

#### Call Signature

> **register**\<`T`, `O`\>(`token`, `provider`, `lock?`): `this`

Defined in: [container.ts:111](https://github.com/orkestrel/core/blob/4aab0d299da5f30a0c75f3eda95d1b02f821688d/src/container.ts#L111)

##### Type Parameters

###### T

`T`

###### O

`O` *extends* `Record`\<`string`, `unknown`\>

##### Parameters

###### token

[`Token`](../type-aliases/Token.md)\<`T`\>

###### provider

[`FactoryProviderWithObject`](../type-aliases/FactoryProviderWithObject.md)\<`T`, `O`\> | [`ClassProviderWithObject`](../type-aliases/ClassProviderWithObject.md)\<`T`, `O`\>

###### lock?

`boolean`

##### Returns

`this`

#### Call Signature

> **register**\<`T`\>(`token`, `provider`, `lock?`): `this`

Defined in: [container.ts:113](https://github.com/orkestrel/core/blob/4aab0d299da5f30a0c75f3eda95d1b02f821688d/src/container.ts#L113)

##### Type Parameters

###### T

`T`

##### Parameters

###### token

[`Token`](../type-aliases/Token.md)\<`T`\>

###### provider

`T` | [`ValueProvider`](../interfaces/ValueProvider.md)\<`T`\> | [`FactoryProviderNoDeps`](../type-aliases/FactoryProviderNoDeps.md)\<`T`\> | [`ClassProviderNoDeps`](../type-aliases/ClassProviderNoDeps.md)\<`T`\>

###### lock?

`boolean`

##### Returns

`this`

***

### resolve()

Strictly resolve a single token or a token map. Missing tokens cause ORK1006 failures.

#### Param

Token to resolve, or a record of tokens to resolve into a map.

#### Example

```ts
const { a, b } = container.resolve({ a: A, b: B })
const [a, b] = container.resolve([A, B] as const)
```

#### Call Signature

> **resolve**\<`T`\>(`token`): `T`

Defined in: [container.ts:181](https://github.com/orkestrel/core/blob/4aab0d299da5f30a0c75f3eda95d1b02f821688d/src/container.ts#L181)

##### Type Parameters

###### T

`T`

##### Parameters

###### token

[`Token`](../type-aliases/Token.md)\<`T`\>

##### Returns

`T`

#### Call Signature

> **resolve**\<`O`\>(`tokens`): `O`

Defined in: [container.ts:183](https://github.com/orkestrel/core/blob/4aab0d299da5f30a0c75f3eda95d1b02f821688d/src/container.ts#L183)

##### Type Parameters

###### O

`O` *extends* `Record`\<`string`, `unknown`\>

##### Parameters

###### tokens

[`InjectObject`](../type-aliases/InjectObject.md)\<`O`\>

##### Returns

`O`

#### Call Signature

> **resolve**\<`A`\>(`tokens`): `A`

Defined in: [container.ts:185](https://github.com/orkestrel/core/blob/4aab0d299da5f30a0c75f3eda95d1b02f821688d/src/container.ts#L185)

##### Type Parameters

###### A

`A` *extends* readonly `unknown`[]

##### Parameters

###### tokens

[`InjectTuple`](../type-aliases/InjectTuple.md)\<`A`\>

##### Returns

`A`

#### Call Signature

> **resolve**\<`TMap`\>(`tokens`): [`ResolvedMap`](../type-aliases/ResolvedMap.md)\<`TMap`\>

Defined in: [container.ts:187](https://github.com/orkestrel/core/blob/4aab0d299da5f30a0c75f3eda95d1b02f821688d/src/container.ts#L187)

##### Type Parameters

###### TMap

`TMap` *extends* [`TokenRecord`](../type-aliases/TokenRecord.md)

##### Parameters

###### tokens

`TMap`

##### Returns

[`ResolvedMap`](../type-aliases/ResolvedMap.md)\<`TMap`\>

***

### set()

> **set**\<`T`\>(`token`, `value`, `lock?`): `void`

Defined in: [container.ts:160](https://github.com/orkestrel/core/blob/4aab0d299da5f30a0c75f3eda95d1b02f821688d/src/container.ts#L160)

Shorthand for registering a value provider.

#### Type Parameters

##### T

`T`

Token value type

#### Parameters

##### token

[`Token`](../type-aliases/Token.md)\<`T`\>

The token to register the value under

##### value

`T`

The value to register

##### lock?

`boolean`

When true, prevents re-registration for this token (default: false)
   *

#### Returns

`void`

void

#### Example

```ts
container.set(ConfigToken, { apiUrl: 'https://api.example.com' })
```

***

### using()

Run work inside an automatically destroyed child scope.

- using(fn): create child, run fn(child), always destroy child afterwards.
- using(apply, fn): create child, run apply(child) to register overrides, then fn(child).

#### Type Param

Return type of the work function.

#### Param

Work function, or an apply function when `arg2` is provided.

#### Param

Optional work function when using the (apply, fn) overload.

#### Example

```ts
const out = await container.using(async (scope) => {
  scope.set(A, 41)
  return scope.resolve(A) + 1
}) // => 42
```

#### Call Signature

> **using**(`fn`): `Promise`\<`void`\>

Defined in: [container.ts:266](https://github.com/orkestrel/core/blob/4aab0d299da5f30a0c75f3eda95d1b02f821688d/src/container.ts#L266)

##### Parameters

###### fn

(`scope`) => `void` \| `Promise`\<`void`\>

##### Returns

`Promise`\<`void`\>

#### Call Signature

> **using**\<`T`\>(`fn`): `Promise`\<`T`\>

Defined in: [container.ts:268](https://github.com/orkestrel/core/blob/4aab0d299da5f30a0c75f3eda95d1b02f821688d/src/container.ts#L268)

##### Type Parameters

###### T

`T`

##### Parameters

###### fn

(`scope`) => `T` \| `Promise`\<`T`\>

##### Returns

`Promise`\<`T`\>

#### Call Signature

> **using**\<`T`\>(`apply`, `fn`): `Promise`\<`T`\>

Defined in: [container.ts:270](https://github.com/orkestrel/core/blob/4aab0d299da5f30a0c75f3eda95d1b02f821688d/src/container.ts#L270)

##### Type Parameters

###### T

`T`

##### Parameters

###### apply

(`scope`) => `void` \| `Promise`\<`void`\>

###### fn

(`scope`) => `T` \| `Promise`\<`T`\>

##### Returns

`Promise`\<`T`\>
