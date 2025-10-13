[**@orkestrel/core**](../index.md)

***

# Function: matchProvider()

## Call Signature

> **matchProvider**\<`T`\>(`provider`, `h`): [`Provider`](../type-aliases/Provider.md)\<`T`\>

Defined in: [helpers.ts:437](https://github.com/orkestrel/core/blob/cbe5b2d7b027ca6f0f1301ef32750afb69b4764b/src/helpers.ts#L437)

Match a provider against its specific shape and dispatch to typed handlers.

Recognized shapes (checked in order):
1) raw value (not a provider object)
2) value provider: `{ useValue }`
3) factory providers: tuple | object | container | noDeps
4) class providers: tuple | object | container | noDeps

### Type Parameters

#### T

`T`

Value type produced by the provider

### Parameters

#### provider

[`Provider`](../type-aliases/Provider.md)\<`T`\>

Provider input (raw value or provider object)

#### h

[`ProviderMatchHandlers`](../type-aliases/ProviderMatchHandlers.md)\<`T`\>

Handlers for each supported provider shape

### Returns

[`Provider`](../type-aliases/Provider.md)\<`T`\>

When handlers return `Provider<T>`, the normalized `Provider<T>`; otherwise the custom type `R`

### Throws

Error with code `ORK1099` when the provider shape is unknown (internal invariant)

### Example

```ts
const out = matchProvider(42, {
  raw: v => ({ useValue: v }),
  value: p => p,
  factoryTuple: p => p,
  factoryObject: p => p,
  factoryContainer: p => p,
  factoryNoDeps: p => p,
  classTuple: p => p,
  classObject: p => p,
  classContainer: p => p,
  classNoDeps: p => p,
})
```

## Call Signature

> **matchProvider**\<`T`, `R`\>(`provider`, `h`): `R`

Defined in: [helpers.ts:438](https://github.com/orkestrel/core/blob/cbe5b2d7b027ca6f0f1301ef32750afb69b4764b/src/helpers.ts#L438)

Match a provider against its specific shape and dispatch to typed handlers.

Recognized shapes (checked in order):
1) raw value (not a provider object)
2) value provider: `{ useValue }`
3) factory providers: tuple | object | container | noDeps
4) class providers: tuple | object | container | noDeps

### Type Parameters

#### T

`T`

Value type produced by the provider

#### R

`R`

Return type when using return handlers (inferred)

### Parameters

#### provider

[`Provider`](../type-aliases/Provider.md)\<`T`\>

Provider input (raw value or provider object)

#### h

[`ProviderMatchReturnHandlers`](../type-aliases/ProviderMatchReturnHandlers.md)\<`T`, `R`\>

Handlers for each supported provider shape

### Returns

`R`

When handlers return `Provider<T>`, the normalized `Provider<T>`; otherwise the custom type `R`

### Throws

Error with code `ORK1099` when the provider shape is unknown (internal invariant)

### Example

```ts
const out = matchProvider(42, {
  raw: v => ({ useValue: v }),
  value: p => p,
  factoryTuple: p => p,
  factoryObject: p => p,
  factoryContainer: p => p,
  factoryNoDeps: p => p,
  classTuple: p => p,
  classObject: p => p,
  classContainer: p => p,
  classNoDeps: p => p,
})
```
