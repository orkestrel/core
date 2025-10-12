[**@orkestrel/core**](../index.md)

***

# Function: getTag()

> **getTag**(`x`): `string`

Defined in: [helpers.ts:520](https://github.com/orkestrel/core/blob/ccb170966790f428093f11a71a5646a6e842dbf9/src/helpers.ts#L520)

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
