[**@orkestrel/core**](../index.md)

***

# Function: getTag()

> **getTag**(`x`): `string`

Defined in: [helpers.ts:499](https://github.com/orkestrel/core/blob/076093e61b67cd3d4198b173439f047ddbc97abc/src/helpers.ts#L499)

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
