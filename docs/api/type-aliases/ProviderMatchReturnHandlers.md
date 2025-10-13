[**@orkestrel/core**](../index.md)

***

# Type Alias: ProviderMatchReturnHandlers\<T, R\>

> **ProviderMatchReturnHandlers**\<`T`, `R`\> = `object`

Defined in: [types.ts:68](https://github.com/orkestrel/core/blob/cbe5b2d7b027ca6f0f1301ef32750afb69b4764b/src/types.ts#L68)

## Type Parameters

### T

`T`

### R

`R`

## Properties

### classContainer()

> **classContainer**: (`p`) => `R`

Defined in: [types.ts:77](https://github.com/orkestrel/core/blob/cbe5b2d7b027ca6f0f1301ef32750afb69b4764b/src/types.ts#L77)

#### Parameters

##### p

[`ClassProviderWithContainer`](ClassProviderWithContainer.md)\<`T`\>

#### Returns

`R`

***

### classNoDeps()

> **classNoDeps**: (`p`) => `R`

Defined in: [types.ts:78](https://github.com/orkestrel/core/blob/cbe5b2d7b027ca6f0f1301ef32750afb69b4764b/src/types.ts#L78)

#### Parameters

##### p

[`ClassProviderNoDeps`](ClassProviderNoDeps.md)\<`T`\>

#### Returns

`R`

***

### classObject()

> **classObject**: \<`O`\>(`p`) => `R`

Defined in: [types.ts:76](https://github.com/orkestrel/core/blob/cbe5b2d7b027ca6f0f1301ef32750afb69b4764b/src/types.ts#L76)

#### Type Parameters

##### O

`O` *extends* `Record`\<`string`, `unknown`\>

#### Parameters

##### p

[`ClassProviderWithObject`](ClassProviderWithObject.md)\<`T`, `O`\>

#### Returns

`R`

***

### classTuple()

> **classTuple**: \<`A`\>(`p`) => `R`

Defined in: [types.ts:75](https://github.com/orkestrel/core/blob/cbe5b2d7b027ca6f0f1301ef32750afb69b4764b/src/types.ts#L75)

#### Type Parameters

##### A

`A` *extends* readonly `unknown`[]

#### Parameters

##### p

[`ClassProviderWithTuple`](ClassProviderWithTuple.md)\<`T`, `A`\>

#### Returns

`R`

***

### factoryContainer()

> **factoryContainer**: (`p`) => `R`

Defined in: [types.ts:73](https://github.com/orkestrel/core/blob/cbe5b2d7b027ca6f0f1301ef32750afb69b4764b/src/types.ts#L73)

#### Parameters

##### p

[`FactoryProviderWithContainer`](FactoryProviderWithContainer.md)\<`T`\>

#### Returns

`R`

***

### factoryNoDeps()

> **factoryNoDeps**: (`p`) => `R`

Defined in: [types.ts:74](https://github.com/orkestrel/core/blob/cbe5b2d7b027ca6f0f1301ef32750afb69b4764b/src/types.ts#L74)

#### Parameters

##### p

[`FactoryProviderNoDeps`](FactoryProviderNoDeps.md)\<`T`\>

#### Returns

`R`

***

### factoryObject()

> **factoryObject**: \<`O`\>(`p`) => `R`

Defined in: [types.ts:72](https://github.com/orkestrel/core/blob/cbe5b2d7b027ca6f0f1301ef32750afb69b4764b/src/types.ts#L72)

#### Type Parameters

##### O

`O` *extends* `Record`\<`string`, `unknown`\>

#### Parameters

##### p

[`FactoryProviderWithObject`](FactoryProviderWithObject.md)\<`T`, `O`\>

#### Returns

`R`

***

### factoryTuple()

> **factoryTuple**: \<`A`\>(`p`) => `R`

Defined in: [types.ts:71](https://github.com/orkestrel/core/blob/cbe5b2d7b027ca6f0f1301ef32750afb69b4764b/src/types.ts#L71)

#### Type Parameters

##### A

`A` *extends* readonly `unknown`[]

#### Parameters

##### p

[`FactoryProviderWithTuple`](FactoryProviderWithTuple.md)\<`T`, `A`\>

#### Returns

`R`

***

### raw()

> **raw**: (`value`) => `R`

Defined in: [types.ts:69](https://github.com/orkestrel/core/blob/cbe5b2d7b027ca6f0f1301ef32750afb69b4764b/src/types.ts#L69)

#### Parameters

##### value

`T`

#### Returns

`R`

***

### value()

> **value**: (`p`) => `R`

Defined in: [types.ts:70](https://github.com/orkestrel/core/blob/cbe5b2d7b027ca6f0f1301ef32750afb69b4764b/src/types.ts#L70)

#### Parameters

##### p

[`ValueProvider`](../interfaces/ValueProvider.md)\<`T`\>

#### Returns

`R`
