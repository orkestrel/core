[**@orkestrel/core**](../index.md)

***

# Function: getTag()

> **getTag**(`x`): `string`

Defined in: [helpers.ts:520](https://github.com/orkestrel/core/blob/240d6e1612057b96fd3fc03e1415fe3917a0f212/src/helpers.ts#L520)

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
