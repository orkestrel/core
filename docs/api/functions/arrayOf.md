[**@orkestrel/core**](../index.md)

***

# Function: arrayOf()

> **arrayOf**\<`T`\>(`elem`): [`Guard`](../type-aliases/Guard.md)\<readonly `T`[]\>

Defined in: [helpers.ts:123](https://github.com/orkestrel/core/blob/ccb170966790f428093f11a71a5646a6e842dbf9/src/helpers.ts#L123)

Build a guard for arrays whose elements satisfy a provided element guard.

## Type Parameters

### T

`T`

Element type produced by the element guard

## Parameters

### elem

[`Guard`](../type-aliases/Guard.md)\<`T`\>

Guard function to validate each array element

## Returns

[`Guard`](../type-aliases/Guard.md)\<readonly `T`[]\>

Guard that checks an array whose elements satisfy elem

## Example

```ts
const isStringArray = arrayOf(isString)
isStringArray(['a','b']) // true
isStringArray(['a', 1]) // false
```
