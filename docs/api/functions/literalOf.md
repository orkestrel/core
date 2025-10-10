[**@orkestrel/core**](../index.md)

***

# Function: literalOf()

> **literalOf**\<`Literals`\>(...`literals`): [`Guard`](../type-aliases/Guard.md)\<`Literals`\[`number`\]\>

Defined in: [helpers.ts:120](https://github.com/orkestrel/core/blob/076093e61b67cd3d4198b173439f047ddbc97abc/src/helpers.ts#L120)

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
