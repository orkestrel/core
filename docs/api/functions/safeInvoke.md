[**@orkestrel/core**](../index.md)

***

# Function: safeInvoke()

> **safeInvoke**\<`TArgs`\>(`fn`, ...`args`): `void`

Defined in: [helpers.ts:555](https://github.com/orkestrel/core/blob/98df1af1b029ad0f39e413b90869151f4152e5dd/src/helpers.ts#L555)

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
