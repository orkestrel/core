[**@orkestrel/core**](../index.md)

***

# Function: isProviderObject()

> **isProviderObject**(`x`): x is Readonly\<Record\<string, unknown\>\> & (\{ useValue: unknown \} \| \{ useFactory: unknown \} \| \{ useClass: unknown \})

Defined in: [helpers.ts:368](https://github.com/orkestrel/core/blob/cbe5b2d7b027ca6f0f1301ef32750afb69b4764b/src/helpers.ts#L368)

Check if a value looks like a provider object (has one of `useValue`/`useFactory`/`useClass`).

## Parameters

### x

`unknown`

Value to check

## Returns

x is Readonly\<Record\<string, unknown\>\> & (\{ useValue: unknown \} \| \{ useFactory: unknown \} \| \{ useClass: unknown \})

True if `x` has at least one provider key

## Example

```ts
isProviderObject({ useValue: 1 }) // true
```
