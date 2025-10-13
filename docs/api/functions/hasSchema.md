[**@orkestrel/core**](../index.md)

***

# Function: hasSchema()

> **hasSchema**\<`S`\>(`obj`, `schema`): `obj is FromSchema<S>`

Defined in: [helpers.ts:194](https://github.com/orkestrel/core/blob/240d6e1612057b96fd3fc03e1415fe3917a0f212/src/helpers.ts#L194)

Check that a value matches an object schema at runtime, with static inference.

## Type Parameters

### S

`S` *extends* `Readonly`\<\{\[`k`: `string`\]: Readonly\<\{ \[k: string\]: Readonly\<...\> \| PrimitiveTag \| Guard\<unknown\>; \}\> \| [`PrimitiveTag`](../type-aliases/PrimitiveTag.md) \| [`Guard`](../type-aliases/Guard.md)\<`unknown`\>; \}\>

The schema specification type

## Parameters

### obj

`unknown`

Value to validate

### schema

`S`

Object schema defining required keys and types/guards

## Returns

`obj is FromSchema<S>`

True when the value satisfies the schema

## Example

```ts
const userSchema = { id: 'string', age: 'number' } as const
if (hasSchema(x, userSchema)) console.log(x.id, x.age)
```
