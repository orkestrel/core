[**@orkestrel/core**](../index.md)

***

# Function: safeInvoke()

> **safeInvoke**\<`TArgs`\>(`fn`, ...`args`): `void`

Defined in: [helpers.ts:555](https://github.com/orkestrel/core/blob/7cc3e19bc4a1e6f96f153d7b931686981208a465/src/helpers.ts#L555)

Safely invoke an optional function with arguments, swallowing any errors.

## Type Parameters

### TArgs

`TArgs` *extends* `unknown`[]

Tuple type of function arguments

## Parameters

### fn

Optional function to invoke (no-op if undefined)

`undefined` | (...`args`) => `unknown`

### args

...`TArgs`

Arguments to pass to the function

## Returns

`void`

## Example

```ts
safeInvoke((x: number) => console.log(x), 1)
```
