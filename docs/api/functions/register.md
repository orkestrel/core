[**@orkestrel/core**](../index.md)

***

# Function: register()

Helper to construct a registration entry with typed inject preservation.
- Accepts tuple or object inject providers, or value/no-deps providers.
- options.dependencies: array or record of tokens; self-dependencies are ignored and duplicates are deduped.
- options.timeouts: per-node timeouts (number or per-phase object).

## Type Param

Token value type.

## Param

The component token.

## Param

Provider implementation (value/factory/class).

## Param

Optional dependencies and timeouts.

## Example

```ts
const entry = register(TOKEN, { useClass: Impl, inject: [DEP_A, DEP_B] }, { dependencies: [DEP_A, DEP_B] })
await app.start([entry])
```

## Call Signature

> **register**\<`T`, `A`\>(`token`, `provider`, `options?`): [`OrchestratorRegistration`](../interfaces/OrchestratorRegistration.md)\<`T`\>

Defined in: [orchestrator.ts:625](https://github.com/orkestrel/core/blob/cbe5b2d7b027ca6f0f1301ef32750afb69b4764b/src/orchestrator.ts#L625)

### Type Parameters

#### T

`T`

#### A

`A` *extends* readonly `unknown`[]

### Parameters

#### token

[`Token`](../type-aliases/Token.md)\<`T`\>

#### provider

[`ClassProviderWithTuple`](../type-aliases/ClassProviderWithTuple.md)\<`T`, `A`\> | [`FactoryProviderWithTuple`](../type-aliases/FactoryProviderWithTuple.md)\<`T`, `A`\>

#### options?

[`RegisterOptions`](../interfaces/RegisterOptions.md)

### Returns

[`OrchestratorRegistration`](../interfaces/OrchestratorRegistration.md)\<`T`\>

## Call Signature

> **register**\<`T`, `O`\>(`token`, `provider`, `options?`): [`OrchestratorRegistration`](../interfaces/OrchestratorRegistration.md)\<`T`\>

Defined in: [orchestrator.ts:626](https://github.com/orkestrel/core/blob/cbe5b2d7b027ca6f0f1301ef32750afb69b4764b/src/orchestrator.ts#L626)

### Type Parameters

#### T

`T`

#### O

`O` *extends* `Record`\<`string`, `unknown`\>

### Parameters

#### token

[`Token`](../type-aliases/Token.md)\<`T`\>

#### provider

[`ClassProviderWithObject`](../type-aliases/ClassProviderWithObject.md)\<`T`, `O`\> | [`FactoryProviderWithObject`](../type-aliases/FactoryProviderWithObject.md)\<`T`, `O`\>

#### options?

[`RegisterOptions`](../interfaces/RegisterOptions.md)

### Returns

[`OrchestratorRegistration`](../interfaces/OrchestratorRegistration.md)\<`T`\>

## Call Signature

> **register**\<`T`\>(`token`, `provider`, `options?`): [`OrchestratorRegistration`](../interfaces/OrchestratorRegistration.md)\<`T`\>

Defined in: [orchestrator.ts:627](https://github.com/orkestrel/core/blob/cbe5b2d7b027ca6f0f1301ef32750afb69b4764b/src/orchestrator.ts#L627)

### Type Parameters

#### T

`T`

### Parameters

#### token

[`Token`](../type-aliases/Token.md)\<`T`\>

#### provider

[`Provider`](../type-aliases/Provider.md)\<`T`\>

#### options?

[`RegisterOptions`](../interfaces/RegisterOptions.md)

### Returns

[`OrchestratorRegistration`](../interfaces/OrchestratorRegistration.md)\<`T`\>
