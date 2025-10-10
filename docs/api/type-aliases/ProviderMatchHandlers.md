[**@orkestrel/core**](../index.md)

***

# Type Alias: ProviderMatchHandlers\<T\>

> **ProviderMatchHandlers**\<`T`\> = `object`

Defined in: [types.ts:60](https://github.com/orkestrel/core/blob/076093e61b67cd3d4198b173439f047ddbc97abc/src/types.ts#L60)

## Type Parameters

### T

`T`

## Properties

### classContainer()

> **classContainer**: (`p`) => [`ClassProviderWithContainer`](ClassProviderWithContainer.md)\<`T`\>

Defined in: [types.ts:69](https://github.com/orkestrel/core/blob/076093e61b67cd3d4198b173439f047ddbc97abc/src/types.ts#L69)

#### Parameters

##### p

[`ClassProviderWithContainer`](ClassProviderWithContainer.md)\<`T`\>

#### Returns

[`ClassProviderWithContainer`](ClassProviderWithContainer.md)\<`T`\>

***

### classNoDeps()

> **classNoDeps**: (`p`) => [`ClassProviderNoDeps`](ClassProviderNoDeps.md)\<`T`\>

Defined in: [types.ts:70](https://github.com/orkestrel/core/blob/076093e61b67cd3d4198b173439f047ddbc97abc/src/types.ts#L70)

#### Parameters

##### p

[`ClassProviderNoDeps`](ClassProviderNoDeps.md)\<`T`\>

#### Returns

[`ClassProviderNoDeps`](ClassProviderNoDeps.md)\<`T`\>

***

### classObject()

> **classObject**: \<`O`\>(`p`) => [`ClassProviderWithObject`](ClassProviderWithObject.md)\<`T`, `O`\>

Defined in: [types.ts:68](https://github.com/orkestrel/core/blob/076093e61b67cd3d4198b173439f047ddbc97abc/src/types.ts#L68)

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

Defined in: [types.ts:67](https://github.com/orkestrel/core/blob/076093e61b67cd3d4198b173439f047ddbc97abc/src/types.ts#L67)

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

Defined in: [types.ts:65](https://github.com/orkestrel/core/blob/076093e61b67cd3d4198b173439f047ddbc97abc/src/types.ts#L65)

#### Parameters

##### p

[`FactoryProviderWithContainer`](FactoryProviderWithContainer.md)\<`T`\>

#### Returns

[`FactoryProviderWithContainer`](FactoryProviderWithContainer.md)\<`T`\>

***

### factoryNoDeps()

> **factoryNoDeps**: (`p`) => [`FactoryProviderNoDeps`](FactoryProviderNoDeps.md)\<`T`\>

Defined in: [types.ts:66](https://github.com/orkestrel/core/blob/076093e61b67cd3d4198b173439f047ddbc97abc/src/types.ts#L66)

#### Parameters

##### p

[`FactoryProviderNoDeps`](FactoryProviderNoDeps.md)\<`T`\>

#### Returns

[`FactoryProviderNoDeps`](FactoryProviderNoDeps.md)\<`T`\>

***

### factoryObject()

> **factoryObject**: \<`O`\>(`p`) => [`FactoryProviderWithObject`](FactoryProviderWithObject.md)\<`T`, `O`\>

Defined in: [types.ts:64](https://github.com/orkestrel/core/blob/076093e61b67cd3d4198b173439f047ddbc97abc/src/types.ts#L64)

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

Defined in: [types.ts:63](https://github.com/orkestrel/core/blob/076093e61b67cd3d4198b173439f047ddbc97abc/src/types.ts#L63)

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

Defined in: [types.ts:61](https://github.com/orkestrel/core/blob/076093e61b67cd3d4198b173439f047ddbc97abc/src/types.ts#L61)

#### Parameters

##### value

`T`

#### Returns

[`Provider`](Provider.md)\<`T`\>

***

### value()

> **value**: (`p`) => [`Provider`](Provider.md)\<`T`\>

Defined in: [types.ts:62](https://github.com/orkestrel/core/blob/076093e61b67cd3d4198b173439f047ddbc97abc/src/types.ts#L62)

#### Parameters

##### p

[`ValueProvider`](../interfaces/ValueProvider.md)\<`T`\>

#### Returns

[`Provider`](Provider.md)\<`T`\>
