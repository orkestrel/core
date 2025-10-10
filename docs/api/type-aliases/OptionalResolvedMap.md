[**@orkestrel/core**](../index.md)

***

# Type Alias: OptionalResolvedMap\<TMap\>

> **OptionalResolvedMap**\<`TMap`\> = \{ \[K in keyof TMap\]: TMap\[K\] extends Token\<infer U\> ? U \| undefined : never \}

Defined in: [types.ts:12](https://github.com/orkestrel/core/blob/36bb4ac962a6eb83d3b3b7e1d15ed7b2fd751427/src/types.ts#L12)

## Type Parameters

### TMap

`TMap` *extends* [`TokenRecord`](TokenRecord.md)
