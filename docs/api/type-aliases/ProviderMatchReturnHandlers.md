[**@orkestrel/core**](../index.md)

***

# Type Alias: ProviderMatchReturnHandlers\<T, R\>

> **ProviderMatchReturnHandlers**\<`T`, `R`\> = `object`

Defined in: [types.ts:73](https://github.com/orkestrel/core/blob/4aab0d299da5f30a0c75f3eda95d1b02f821688d/src/types.ts#L73)

## Type Parameters

### T

`T`

### R

`R`

## Properties

### classContainer()

> **classContainer**: (`p`) => `R`

Defined in: [types.ts:82](https://github.com/orkestrel/core/blob/4aab0d299da5f30a0c75f3eda95d1b02f821688d/src/types.ts#L82)

#### Parameters

##### p

[`ClassProviderWithContainer`](ClassProviderWithContainer.md)\<`T`\>

#### Returns

`R`

***

### classNoDeps()

> **classNoDeps**: (`p`) => `R`

Defined in: [types.ts:83](https://github.com/orkestrel/core/blob/4aab0d299da5f30a0c75f3eda95d1b02f821688d/src/types.ts#L83)

#### Parameters

##### p

[`ClassProviderNoDeps`](ClassProviderNoDeps.md)\<`T`\>

#### Returns

`R`

***

### classObject()

> **classObject**: \<`O`\>(`p`) => `R`

Defined in: [types.ts:81](https://github.com/orkestrel/core/blob/4aab0d299da5f30a0c75f3eda95d1b02f821688d/src/types.ts#L81)

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

Defined in: [types.ts:80](https://github.com/orkestrel/core/blob/4aab0d299da5f30a0c75f3eda95d1b02f821688d/src/types.ts#L80)

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

Defined in: [types.ts:78](https://github.com/orkestrel/core/blob/4aab0d299da5f30a0c75f3eda95d1b02f821688d/src/types.ts#L78)

#### Parameters

##### p

[`FactoryProviderWithContainer`](FactoryProviderWithContainer.md)\<`T`\>

#### Returns

`R`

***

### factoryNoDeps()

> **factoryNoDeps**: (`p`) => `R`

Defined in: [types.ts:79](https://github.com/orkestrel/core/blob/4aab0d299da5f30a0c75f3eda95d1b02f821688d/src/types.ts#L79)

#### Parameters

##### p

[`FactoryProviderNoDeps`](FactoryProviderNoDeps.md)\<`T`\>

#### Returns

`R`

***

### factoryObject()

> **factoryObject**: \<`O`\>(`p`) => `R`

Defined in: [types.ts:77](https://github.com/orkestrel/core/blob/4aab0d299da5f30a0c75f3eda95d1b02f821688d/src/types.ts#L77)

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

Defined in: [types.ts:76](https://github.com/orkestrel/core/blob/4aab0d299da5f30a0c75f3eda95d1b02f821688d/src/types.ts#L76)

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

Defined in: [types.ts:74](https://github.com/orkestrel/core/blob/4aab0d299da5f30a0c75f3eda95d1b02f821688d/src/types.ts#L74)

#### Parameters

##### value

`T`

#### Returns

`R`

***

### value()

> **value**: (`p`) => `R`

Defined in: [types.ts:75](https://github.com/orkestrel/core/blob/4aab0d299da5f30a0c75f3eda95d1b02f821688d/src/types.ts#L75)

#### Parameters

##### p

[`ValueProvider`](../interfaces/ValueProvider.md)\<`T`\>

#### Returns

`R`
