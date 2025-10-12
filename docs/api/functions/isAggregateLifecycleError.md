[**@orkestrel/core**](../index.md)

***

# Function: isAggregateLifecycleError()

> **isAggregateLifecycleError**(`x`): `x is AggregateLifecycleError`

Defined in: [helpers.ts:674](https://github.com/orkestrel/core/blob/ccb170966790f428093f11a71a5646a6e842dbf9/src/helpers.ts#L674)

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
