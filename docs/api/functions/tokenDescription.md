[**@orkestrel/core**](../index.md)

***

# Function: tokenDescription()

> **tokenDescription**(`token`): `string`

Defined in: [helpers.ts:322](https://github.com/orkestrel/core/blob/cbe5b2d7b027ca6f0f1301ef32750afb69b4764b/src/helpers.ts#L322)

Format token symbols consistently for logs and diagnostics.

Returns the symbol description when available, otherwise `String(token)`.

## Parameters

### token

`symbol`

Token symbol to format

## Returns

`string`

Token description or its string representation

## Example

```ts
tokenDescription(Symbol('User')) // 'User'
```
