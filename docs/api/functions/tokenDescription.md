[**@orkestrel/core**](../index.md)

***

# Function: tokenDescription()

> **tokenDescription**(`token`): `string`

Defined in: [helpers.ts:575](https://github.com/orkestrel/core/blob/4aab0d299da5f30a0c75f3eda95d1b02f821688d/src/helpers.ts#L575)

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
