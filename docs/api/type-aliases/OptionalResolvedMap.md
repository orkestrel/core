[**@orkestrel/core**](../index.md)

***

# Type Alias: OptionalResolvedMap\<TMap\>

> **OptionalResolvedMap**\<`TMap`\> = \{ \[K in keyof TMap\]: TMap\[K\] extends Token\<infer U\> ? U \| undefined : never \}

Defined in: [types.ts:12](https://github.com/orkestrel/core/blob/7cc3e19bc4a1e6f96f153d7b931686981208a465/src/types.ts#L12)

## Type Parameters

### TMap

`TMap` *extends* [`TokenRecord`](TokenRecord.md)
