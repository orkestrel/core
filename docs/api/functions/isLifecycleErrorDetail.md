[**@orkestrel/core**](../index.md)

***

# Function: isLifecycleErrorDetail()

> **isLifecycleErrorDetail**(`x`): x is \{ context: "normal" \| "rollback" \| "container"; durationMs: number; error: Error; phase: "start" \| "stop" \| "destroy"; timedOut: boolean; tokenDescription: string \}

Defined in: [helpers.ts:591](https://github.com/orkestrel/core/blob/98df1af1b029ad0f39e413b90869151f4152e5dd/src/helpers.ts#L591)

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
