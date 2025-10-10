[**@orkestrel/core**](../index.md)

***

# Function: createPortTokens()

> **createPortTokens**\<`T`\>(`shape`, `namespace`): [`TokensOf`](../type-aliases/TokensOf.md)\<`T`\>

Defined in: [ports.ts:27](https://github.com/orkestrel/core/blob/7cc3e19bc4a1e6f96f153d7b931686981208a465/src/ports.ts#L27)

Create a read-only set of Port tokens from a shape object.

Each key in the provided shape becomes a token in the returned object, and the value's TypeScript type
is used as the token's generic type parameter.

## Type Parameters

### T

`T` *extends* `Record`\<`string`, `unknown`\>

## Parameters

### shape

`T`

Object whose keys are port names and values define the token types via their TypeScript shape.

### namespace

`string` = `'ports'`

Optional namespace prefix used in token descriptions (default: 'ports').

## Returns

[`TokensOf`](../type-aliases/TokensOf.md)\<`T`\>

A frozen map of tokens keyed by the provided shape's keys.

## See

extendPorts

## Example

```ts
import { createPortTokens, Container } from '@orkestrel/core'
const ports = createPortTokens({ logger: undefined as { info(msg: string): void } })
const c = new Container()
c.set(ports.logger, { info: console.log })
c.resolve(ports.logger).info('hello')
```
