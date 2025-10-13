[**@orkestrel/core**](../index.md)

***

# Type Alias: OptionalResolvedMap\<TMap\>

> **OptionalResolvedMap**\<`TMap`\> = \{ \[K in keyof TMap\]: TMap\[K\] extends Token\<infer U\> ? U \| undefined : never \}

Defined in: [types.ts:12](https://github.com/orkestrel/core/blob/240d6e1612057b96fd3fc03e1415fe3917a0f212/src/types.ts#L12)

## Type Parameters

### TMap

`TMap` *extends* [`TokenRecord`](TokenRecord.md)
