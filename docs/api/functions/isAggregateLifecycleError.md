[**@orkestrel/core**](../index.md)

***

# Function: isAggregateLifecycleError()

> **isAggregateLifecycleError**(`x`): `x is AggregateLifecycleError`

Defined in: [helpers.ts:674](https://github.com/orkestrel/core/blob/240d6e1612057b96fd3fc03e1415fe3917a0f212/src/helpers.ts#L674)

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
