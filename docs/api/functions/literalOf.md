[**@orkestrel/core**](../index.md)

***

# Function: literalOf()

> **literalOf**\<`Literals`\>(...`literals`): [`Guard`](../type-aliases/Guard.md)\<`Literals`\[`number`\]\>

Defined in: [helpers.ts:141](https://github.com/orkestrel/core/blob/ccb170966790f428093f11a71a5646a6e842dbf9/src/helpers.ts#L141)

Build a guard for a literal union by value equality.

## Type Parameters

### Literals

`Literals` *extends* readonly (`string` \| `number` \| `boolean`)[]

Tuple of literal values

## Parameters

### literals

...`Literals`

Values that are considered valid

## Returns

[`Guard`](../type-aliases/Guard.md)\<`Literals`\[`number`\]\>

Guard that matches when x equals one of the literals

## Example

```ts
const isEnv = literalOf('dev', 'prod' as const)
isEnv('dev') // true
isEnv('staging') // false
```
