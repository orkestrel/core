[**@orkestrel/core**](../index.md)

***

# Function: isProviderObject()

> **isProviderObject**(`x`): x is Readonly\<Record\<string, unknown\>\> & (\{ useValue: unknown \} \| \{ useFactory: unknown \} \| \{ useClass: unknown \})

Defined in: [helpers.ts:621](https://github.com/orkestrel/core/blob/7cc3e19bc4a1e6f96f153d7b931686981208a465/src/helpers.ts#L621)

Check if a value looks like a provider object (has `useValue`/`useFactory`/`useClass`).

## Parameters

### x

`unknown`

Value to check

## Returns

x is Readonly\<Record\<string, unknown\>\> & (\{ useValue: unknown \} \| \{ useFactory: unknown \} \| \{ useClass: unknown \})

True if x has at least one provider key

## Example

```ts
isProviderObject({ useValue: 1 }) // true
```
