[**@orkestrel/core**](../index.md)

***

# Type Alias: ResolvedMap\<TMap\>

> **ResolvedMap**\<`TMap`\> = `{ [K in keyof TMap]: TMap[K] extends Token<infer U> ? U : never }`

Defined in: [types.ts:11](https://github.com/orkestrel/core/blob/076093e61b67cd3d4198b173439f047ddbc97abc/src/types.ts#L11)

## Type Parameters

### TMap

`TMap` *extends* [`TokenRecord`](TokenRecord.md)
