[**@orkestrel/core**](../index.md)

***

# Function: getTag()

> **getTag**(`x`): `string`

Defined in: [helpers.ts:499](https://github.com/orkestrel/core/blob/7cc3e19bc4a1e6f96f153d7b931686981208a465/src/helpers.ts#L499)

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
