[**@orkestrel/core**](../index.md)

***

# Function: isLifecycleErrorDetail()

> **isLifecycleErrorDetail**(`x`): x is \{ context: "normal" \| "rollback" \| "container"; durationMs: number; error: Error; phase: "start" \| "stop" \| "destroy"; timedOut: boolean; tokenDescription: string \}

Defined in: [helpers.ts:591](https://github.com/orkestrel/core/blob/4aab0d299da5f30a0c75f3eda95d1b02f821688d/src/helpers.ts#L591)

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
