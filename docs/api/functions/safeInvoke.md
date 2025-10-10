[**@orkestrel/core**](../index.md)

***

# Function: safeInvoke()

> **safeInvoke**\<`TArgs`\>(`fn`, ...`args`): `void`

Defined in: [helpers.ts:555](https://github.com/orkestrel/core/blob/36bb4ac962a6eb83d3b3b7e1d15ed7b2fd751427/src/helpers.ts#L555)

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
