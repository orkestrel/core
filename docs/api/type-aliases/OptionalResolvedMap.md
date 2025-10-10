[**@orkestrel/core**](../index.md)

***

# Type Alias: OptionalResolvedMap\<TMap\>

> **OptionalResolvedMap**\<`TMap`\> = \{ \[K in keyof TMap\]: TMap\[K\] extends Token\<infer U\> ? U \| undefined : never \}

Defined in: [types.ts:12](https://github.com/orkestrel/core/blob/076093e61b67cd3d4198b173439f047ddbc97abc/src/types.ts#L12)

## Type Parameters

### TMap

`TMap` *extends* [`TokenRecord`](TokenRecord.md)
