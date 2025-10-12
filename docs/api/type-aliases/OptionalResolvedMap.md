[**@orkestrel/core**](../index.md)

***

# Type Alias: OptionalResolvedMap\<TMap\>

> **OptionalResolvedMap**\<`TMap`\> = \{ \[K in keyof TMap\]: TMap\[K\] extends Token\<infer U\> ? U \| undefined : never \}

Defined in: [types.ts:12](https://github.com/orkestrel/core/blob/ccb170966790f428093f11a71a5646a6e842dbf9/src/types.ts#L12)

## Type Parameters

### TMap

`TMap` *extends* [`TokenRecord`](TokenRecord.md)
