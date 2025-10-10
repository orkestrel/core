[**@orkestrel/core**](../index.md)

***

# Function: isAsyncFunction()

> **isAsyncFunction**(`fn`): `fn is (args: unknown[]) => Promise<unknown>`

Defined in: [helpers.ts:514](https://github.com/orkestrel/core/blob/36bb4ac962a6eb83d3b3b7e1d15ed7b2fd751427/src/helpers.ts#L514)

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
