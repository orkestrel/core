[**@orkestrel/core**](../index.md)

***

# Function: isAsyncFunction()

> **isAsyncFunction**(`fn`): `fn is (args: unknown[]) => Promise<unknown>`

Defined in: [helpers.ts:514](https://github.com/orkestrel/core/blob/4aab0d299da5f30a0c75f3eda95d1b02f821688d/src/helpers.ts#L514)

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
