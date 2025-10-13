[**@orkestrel/core**](../index.md)

***

# Function: isAsyncFunction()

> **isAsyncFunction**(`fn`): `fn is (args: unknown[]) => Promise<unknown>`

Defined in: [helpers.ts:535](https://github.com/orkestrel/core/blob/240d6e1612057b96fd3fc03e1415fe3917a0f212/src/helpers.ts#L535)

Heuristic check for an async function (native or transpiled).

## Parameters

### fn

`unknown`

Value to check

## Returns

`fn is (args: unknown[]) => Promise<unknown>`

True if fn appears to be an async function

## Example

```ts
isAsyncFunction(async () => {}) // true
```
