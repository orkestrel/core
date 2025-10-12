[**@orkestrel/core**](../index.md)

***

# Function: isLifecycleErrorDetail()

> **isLifecycleErrorDetail**(`x`): x is \{ context: "normal" \| "rollback" \| "container"; durationMs: number; error: Error; phase: "start" \| "stop" \| "destroy"; timedOut: boolean; tokenDescription: string \}

Defined in: [helpers.ts:612](https://github.com/orkestrel/core/blob/ccb170966790f428093f11a71a5646a6e842dbf9/src/helpers.ts#L612)

Runtime guard for LifecycleErrorDetail using a schema definition.

## Parameters

### x

`unknown`

Value to validate

## Returns

x is \{ context: "normal" \| "rollback" \| "container"; durationMs: number; error: Error; phase: "start" \| "stop" \| "destroy"; timedOut: boolean; tokenDescription: string \}

True if x matches the expected shape

## Example

```ts
const detail = { tokenDescription: 'A', phase: 'start', context: 'normal', timedOut: false, durationMs: 1, error: new Error('x') }
isLifecycleErrorDetail(detail) // true
```
