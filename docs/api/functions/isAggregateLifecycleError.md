[**@orkestrel/core**](../index.md)

***

# Function: isAggregateLifecycleError()

> **isAggregateLifecycleError**(`x`): `x is AggregateLifecycleError`

Defined in: [helpers.ts:653](https://github.com/orkestrel/core/blob/4aab0d299da5f30a0c75f3eda95d1b02f821688d/src/helpers.ts#L653)

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
