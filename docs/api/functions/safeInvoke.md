[**@orkestrel/core**](../index.md)

***

# Function: safeInvoke()

> **safeInvoke**\<`TArgs`\>(`fn`, ...`args`): `void`

Defined in: [helpers.ts:301](https://github.com/orkestrel/core/blob/cbe5b2d7b027ca6f0f1301ef32750afb69b4764b/src/helpers.ts#L301)

Safely invoke an optional function with arguments, swallowing any errors.

Useful for optional callbacks and diagnostic hooks. Errors are intentionally ignored
to avoid cascading failures in listeners/loggers.

## Type Parameters

### TArgs

`TArgs` *extends* `unknown`[]

Tuple of argument types

## Parameters

### fn

Optional function to call

(...`args`) => `unknown` | `undefined`

### args

...`TArgs`

Arguments to pass to `fn`

## Returns

`void`

void

## Example

```ts
safeInvoke((x: number) => console.log(x), 1)
safeInvoke(undefined, 'ignored')
```
