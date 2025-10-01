# Concepts

Core ideas you’ll use everywhere.

## Ports and Tokens
Source: [src/ports.ts](../src/ports.ts)
- Ports are TypeScript interfaces that describe capabilities (e.g., `EmailPort`).
- Tokens uniquely identify those capabilities at runtime.
- Create token sets with `createPortTokens(shape, namespace?)`.
- Create a single token with `createPortToken(name)`.

```ts
import { createPortTokens, createPortToken } from '@orkestrel/core'

interface EmailPort { send(to: string, subject: string, body: string): Promise<void> }
const Ports = createPortTokens({ email: {} as EmailPort })
const EmailToken = createPortToken<EmailPort>('email')
```

## Adapters
Source: [src/adapter.ts](../src/adapter.ts)
- Implement your ports with classes or plain objects.
- Adapters that need lifecycle can extend `Adapter` (which extends `Lifecycle`).

## Container (DI)
Source: [src/container.ts](../src/container.ts)
- Registers tokens with providers (value, factory, class).
- Resolves instances, optionally walking up to a parent container.
- `resolve(token | map)` is strict and throws if a token is not registered.
- `get(token | map)` is optional and returns `undefined` (or maps of `T | undefined`) for missing tokens.
- `createChild()` creates a scoped container.
- `destroy()` stops/destroys any Lifecycle instances created via providers.

Global helper
- `container(name?)` returns a Container; a default instance is auto-registered under a symbol.
- `container.resolve(token | map, name?)`/`container.get(token | map, name?)` mirror `Container` methods and support named instances.

## Orchestrator
Source: [src/orchestrator.ts](../src/orchestrator.ts)
- Registers components with optional dependencies (tokens).
- Starts/Stops/Destroys all lifecycle components in dependency order.
- Use `register(token, provider)` or `register(token, provider, { dependencies: [... or { alias: token }], timeouts: { onStart?, onStop?, onDestroy? } })` to build arrays for `start([...])`.

Global helper
- `orchestrator(name?)` returns the Orchestrator; a default instance is auto-registered and bound to the default container.

## Lifecycle
Source: [src/lifecycle.ts](../src/lifecycle.ts)
- Safe transitions: `created → started → stopped → destroyed`.
- Protected hooks to override: `onCreate`, `onStart`, `onStop`, `onDestroy`.
- Emits events and enforces hook timeouts.

See the full API reference for all methods and types: `./api.md`.
