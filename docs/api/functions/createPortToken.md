[**@orkestrel/core**](../index.md)

***

# Function: createPortToken()

> **createPortToken**\<`T`\>(`name`): [`Token`](../type-aliases/Token.md)\<`T`\>

Defined in: [ports.ts:81](https://github.com/orkestrel/core/blob/ccb170966790f428093f11a71a5646a6e842dbf9/src/ports.ts#L81)

Create a single Port token with a stable description under the `ports:` namespace.

## Type Parameters

### T

`T`

## Parameters

### name

`string`

Port name appended to the 'ports:' namespace for Symbol description.

## Returns

[`Token`](../type-aliases/Token.md)\<`T`\>

A Token<T> describing the named port.

## Example

```ts
const HttpPort = createPortToken<{ get(url: string): Promise<string> }>('http')
// container.set(HttpPort, impl)
```
