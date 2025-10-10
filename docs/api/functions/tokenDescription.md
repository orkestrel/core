[**@orkestrel/core**](../index.md)

***

# Function: tokenDescription()

> **tokenDescription**(`token`): `string`

Defined in: [helpers.ts:575](https://github.com/orkestrel/core/blob/36bb4ac962a6eb83d3b3b7e1d15ed7b2fd751427/src/helpers.ts#L575)

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
