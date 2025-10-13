[**@orkestrel/core**](../index.md)

***

# Type Alias: ProviderMatchHandlers\<T\>

> **ProviderMatchHandlers**\<`T`\> = `object`

Defined in: [types.ts:55](https://github.com/orkestrel/core/blob/240d6e1612057b96fd3fc03e1415fe3917a0f212/src/types.ts#L55)

## Type Parameters

### T

`T`

## Properties

### classContainer()

> **classContainer**: (`p`) => [`ClassProviderWithContainer`](ClassProviderWithContainer.md)\<`T`\>

Defined in: [types.ts:64](https://github.com/orkestrel/core/blob/240d6e1612057b96fd3fc03e1415fe3917a0f212/src/types.ts#L64)

#### Parameters

##### p

[`ClassProviderWithContainer`](ClassProviderWithContainer.md)\<`T`\>

#### Returns

[`ClassProviderWithContainer`](ClassProviderWithContainer.md)\<`T`\>

***

### classNoDeps()

> **classNoDeps**: (`p`) => [`ClassProviderNoDeps`](ClassProviderNoDeps.md)\<`T`\>

Defined in: [types.ts:65](https://github.com/orkestrel/core/blob/240d6e1612057b96fd3fc03e1415fe3917a0f212/src/types.ts#L65)

#### Parameters

##### p

[`ClassProviderNoDeps`](ClassProviderNoDeps.md)\<`T`\>

#### Returns

[`ClassProviderNoDeps`](ClassProviderNoDeps.md)\<`T`\>

***

### classObject()

> **classObject**: \<`O`\>(`p`) => [`ClassProviderWithObject`](ClassProviderWithObject.md)\<`T`, `O`\>

Defined in: [types.ts:63](https://github.com/orkestrel/core/blob/240d6e1612057b96fd3fc03e1415fe3917a0f212/src/types.ts#L63)

#### Type Parameters

##### O

`O` *extends* `Record`\<`string`, `unknown`\>

#### Parameters

##### p

[`ClassProviderWithObject`](ClassProviderWithObject.md)\<`T`, `O`\>

#### Returns

[`ClassProviderWithObject`](ClassProviderWithObject.md)\<`T`, `O`\>

***

### classTuple()

> **classTuple**: \<`A`\>(`p`) => [`ClassProviderWithTuple`](ClassProviderWithTuple.md)\<`T`, `A`\>

Defined in: [types.ts:62](https://github.com/orkestrel/core/blob/240d6e1612057b96fd3fc03e1415fe3917a0f212/src/types.ts#L62)

#### Type Parameters

##### A

`A` *extends* readonly `unknown`[]

#### Parameters

##### p

[`ClassProviderWithTuple`](ClassProviderWithTuple.md)\<`T`, `A`\>

#### Returns

[`ClassProviderWithTuple`](ClassProviderWithTuple.md)\<`T`, `A`\>

***

### factoryContainer()

> **factoryContainer**: (`p`) => [`FactoryProviderWithContainer`](FactoryProviderWithContainer.md)\<`T`\>

Defined in: [types.ts:60](https://github.com/orkestrel/core/blob/240d6e1612057b96fd3fc03e1415fe3917a0f212/src/types.ts#L60)

#### Parameters

##### p

[`FactoryProviderWithContainer`](FactoryProviderWithContainer.md)\<`T`\>

#### Returns

[`FactoryProviderWithContainer`](FactoryProviderWithContainer.md)\<`T`\>

***

### factoryNoDeps()

> **factoryNoDeps**: (`p`) => [`FactoryProviderNoDeps`](FactoryProviderNoDeps.md)\<`T`\>

Defined in: [types.ts:61](https://github.com/orkestrel/core/blob/240d6e1612057b96fd3fc03e1415fe3917a0f212/src/types.ts#L61)

#### Parameters

##### p

[`FactoryProviderNoDeps`](FactoryProviderNoDeps.md)\<`T`\>

#### Returns

[`FactoryProviderNoDeps`](FactoryProviderNoDeps.md)\<`T`\>

***

### factoryObject()

> **factoryObject**: \<`O`\>(`p`) => [`FactoryProviderWithObject`](FactoryProviderWithObject.md)\<`T`, `O`\>

Defined in: [types.ts:59](https://github.com/orkestrel/core/blob/240d6e1612057b96fd3fc03e1415fe3917a0f212/src/types.ts#L59)

#### Type Parameters

##### O

`O` *extends* `Record`\<`string`, `unknown`\>

#### Parameters

##### p

[`FactoryProviderWithObject`](FactoryProviderWithObject.md)\<`T`, `O`\>

#### Returns

[`FactoryProviderWithObject`](FactoryProviderWithObject.md)\<`T`, `O`\>

***

### factoryTuple()

> **factoryTuple**: \<`A`\>(`p`) => [`FactoryProviderWithTuple`](FactoryProviderWithTuple.md)\<`T`, `A`\>

Defined in: [types.ts:58](https://github.com/orkestrel/core/blob/240d6e1612057b96fd3fc03e1415fe3917a0f212/src/types.ts#L58)

#### Type Parameters

##### A

`A` *extends* readonly `unknown`[]

#### Parameters

##### p

[`FactoryProviderWithTuple`](FactoryProviderWithTuple.md)\<`T`, `A`\>

#### Returns

[`FactoryProviderWithTuple`](FactoryProviderWithTuple.md)\<`T`, `A`\>

***

### raw()

> **raw**: (`value`) => [`Provider`](Provider.md)\<`T`\>

Defined in: [types.ts:56](https://github.com/orkestrel/core/blob/240d6e1612057b96fd3fc03e1415fe3917a0f212/src/types.ts#L56)

#### Parameters

##### value

`T`

#### Returns

[`Provider`](Provider.md)\<`T`\>

***

### value()

> **value**: (`p`) => [`Provider`](Provider.md)\<`T`\>

Defined in: [types.ts:57](https://github.com/orkestrel/core/blob/240d6e1612057b96fd3fc03e1415fe3917a0f212/src/types.ts#L57)

#### Parameters

##### p

[`ValueProvider`](../interfaces/ValueProvider.md)\<`T`\>

#### Returns

[`Provider`](Provider.md)\<`T`\>
