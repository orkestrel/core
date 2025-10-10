[**@orkestrel/core**](../index.md)

***

# Function: isAggregateLifecycleError()

> **isAggregateLifecycleError**(`x`): `x is AggregateLifecycleError`

Defined in: [helpers.ts:653](https://github.com/orkestrel/core/blob/076093e61b67cd3d4198b173439f047ddbc97abc/src/helpers.ts#L653)

Guard for aggregate lifecycle error shape used by DiagnosticAdapter.aggregate.

## Parameters

### x

`unknown`

Value to validate

## Returns

`x is AggregateLifecycleError`

True if x has details and errors arrays

## Example

```ts
const agg = { details: [], errors: [] }
isAggregateLifecycleError(agg) // true
```
