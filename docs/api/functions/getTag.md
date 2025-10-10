[**@orkestrel/core**](../index.md)

***

# Function: getTag()

> **getTag**(`x`): `string`

Defined in: [helpers.ts:499](https://github.com/orkestrel/core/blob/36bb4ac962a6eb83d3b3b7e1d15ed7b2fd751427/src/helpers.ts#L499)

Return the internal [[Class]] tag string for a value.

## Parameters

### x

`unknown`

Value to inspect

## Returns

`string`

Tag like "[object Array]" or "[object Date]"

## Example

```ts
getTag([]) // "[object Array]"
```
