[**@orkestrel/core**](../index.md)

***

# Function: tokenDescription()

> **tokenDescription**(`token`): `string`

Defined in: [helpers.ts:575](https://github.com/orkestrel/core/blob/7cc3e19bc4a1e6f96f153d7b931686981208a465/src/helpers.ts#L575)

Helper to format token symbols consistently for logs and diagnostics.

## Parameters

### token

`symbol`

Symbol token to format

## Returns

`string`

The token's description or its string representation

## Example

```ts
tokenDescription(Symbol('UserService')) // 'UserService'
```
