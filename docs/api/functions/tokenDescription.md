[**@orkestrel/core**](../index.md)

***

# Function: tokenDescription()

> **tokenDescription**(`token`): `string`

Defined in: [helpers.ts:575](https://github.com/orkestrel/core/blob/076093e61b67cd3d4198b173439f047ddbc97abc/src/helpers.ts#L575)

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
