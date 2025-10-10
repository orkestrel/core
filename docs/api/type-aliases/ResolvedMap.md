[**@orkestrel/core**](../index.md)

***

# Type Alias: ResolvedMap\<TMap\>

> **ResolvedMap**\<`TMap`\> = `{ [K in keyof TMap]: TMap[K] extends Token<infer U> ? U : never }`

Defined in: [types.ts:11](https://github.com/orkestrel/core/blob/36bb4ac962a6eb83d3b3b7e1d15ed7b2fd751427/src/types.ts#L11)

## Type Parameters

### TMap

`TMap` *extends* [`TokenRecord`](TokenRecord.md)
