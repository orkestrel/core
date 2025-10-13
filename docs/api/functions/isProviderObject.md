[**@orkestrel/core**](../index.md)

***

# Function: isProviderObject()

> **isProviderObject**(`x`): x is Readonly\<Record\<string, unknown\>\> & (\{ useValue: unknown \} \| \{ useFactory: unknown \} \| \{ useClass: unknown \})

Defined in: [helpers.ts:642](https://github.com/orkestrel/core/blob/240d6e1612057b96fd3fc03e1415fe3917a0f212/src/helpers.ts#L642)

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
