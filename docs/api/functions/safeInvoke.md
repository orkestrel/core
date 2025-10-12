[**@orkestrel/core**](../index.md)

***

# Function: safeInvoke()

> **safeInvoke**\<`TArgs`\>(`fn`, ...`args`): `void`

Defined in: [helpers.ts:576](https://github.com/orkestrel/core/blob/ccb170966790f428093f11a71a5646a6e842dbf9/src/helpers.ts#L576)

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
