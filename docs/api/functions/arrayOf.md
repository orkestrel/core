[**@orkestrel/core**](../index.md)

***

# Function: arrayOf()

> **arrayOf**\<`T`\>(`elem`): [`Guard`](../type-aliases/Guard.md)\<readonly `T`[]\>

Defined in: [helpers.ts:102](https://github.com/orkestrel/core/blob/36bb4ac962a6eb83d3b3b7e1d15ed7b2fd751427/src/helpers.ts#L102)

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
