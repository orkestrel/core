[**@orkestrel/core**](../index.md)

***

# Function: isProviderObject()

> **isProviderObject**(`x`): x is Readonly\<Record\<string, unknown\>\> & (\{ useValue: unknown \} \| \{ useFactory: unknown \} \| \{ useClass: unknown \})

Defined in: [helpers.ts:621](https://github.com/orkestrel/core/blob/98df1af1b029ad0f39e413b90869151f4152e5dd/src/helpers.ts#L621)

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
