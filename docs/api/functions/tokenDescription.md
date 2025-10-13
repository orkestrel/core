[**@orkestrel/core**](../index.md)

***

# Function: tokenDescription()

> **tokenDescription**(`token`): `string`

Defined in: [helpers.ts:596](https://github.com/orkestrel/core/blob/240d6e1612057b96fd3fc03e1415fe3917a0f212/src/helpers.ts#L596)

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
