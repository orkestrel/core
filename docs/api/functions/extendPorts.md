[**@orkestrel/core**](../index.md)

***

# Function: extendPorts()

Extend an existing token map or create a new one from a shape.

- extendPorts(ext) creates a new token set from scratch.
- extendPorts(base, ext) merges into an existing token map (throws on duplicate keys).

## Param

Either just the extension shape, or a base map and extension shape

## Throws

Error with code ORK1040 when duplicate keys are present in the extension shape

## Example

```ts
const base = createPortTokens({ a: undefined as number })
const more = extendPorts(base, { b: undefined as string })
// more.a and more.b are tokens
```

## Call Signature

> **extendPorts**\<`Ext`\>(`ext`): `Readonly`\<[`TokensOf`](../type-aliases/TokensOf.md)\<`Ext`\>\>

Defined in: [ports.ts:32](https://github.com/orkestrel/core/blob/7cc3e19bc4a1e6f96f153d7b931686981208a465/src/ports.ts#L32)

Extend an existing set of Port tokens with additional ports or create a new one (overload).

### Type Parameters

#### Ext

`Ext` *extends* `Record`\<`string`, `unknown`\>

### Parameters

#### ext

`Ext`

### Returns

`Readonly`\<[`TokensOf`](../type-aliases/TokensOf.md)\<`Ext`\>\>

## Call Signature

> **extendPorts**\<`Base`, `Ext`\>(`base`, `ext`): `Readonly`\<`Base` & [`TokensOf`](../type-aliases/TokensOf.md)\<`Ext`\>\>

Defined in: [ports.ts:34](https://github.com/orkestrel/core/blob/7cc3e19bc4a1e6f96f153d7b931686981208a465/src/ports.ts#L34)

Extend a base token map with an extension shape (overload).

### Type Parameters

#### Base

`Base` *extends* `Record`\<`string`, [`Token`](../type-aliases/Token.md)\<`unknown`\>\>

#### Ext

`Ext` *extends* `Record`\<`string`, `unknown`\>

### Parameters

#### base

`Base`

#### ext

`Ext`

### Returns

`Readonly`\<`Base` & [`TokensOf`](../type-aliases/TokensOf.md)\<`Ext`\>\>
