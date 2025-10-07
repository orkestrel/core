# Registry (Port + Adapter)

Manage named instances with an optional default and locking semantics. Resolve strictly (throws) or get optionally (undefined when missing).

## Purpose
- Hold one or more named instances (by string or symbol) with an optional default.
- Protect defaults and locked entries from accidental replacement/clear.
- Provide strict `resolve()` or optional `get()` retrieval.

## Contract
- Port: `RegistryPort<T>`
  - `get(name?: string | symbol): T | undefined`
    - Non-throwing lookup; returns undefined if missing
  - `resolve(name?: string | symbol): T`
    - Throws when missing
  - `set(name: string | symbol, value: T, lock?: boolean): void`
    - Registers or replaces a named value; when `lock=true`, future replacements are rejected
  - `clear(name?: string | symbol, force?: boolean): boolean`
    - Removes a named entry; defaults are protected; locked entries require `force=true`
  - `list(): ReadonlyArray<string | symbol>`
    - Returns all registered keys (including the default symbol key if present)

## Default adapter
- `RegistryAdapter<T>` implements the above semantics and supports a protected default key via `options.default`.
- Options: `RegistryAdapterOptions<T> = { label?: string; default?: { key?: symbol; value: T } }`
  - `label` is used in diagnostics messages.
  - `default` seeds the registry with a protected default key (generated if `key` is omitted).
- Diagnostics (via `diagnostics` helpers)
  - Missing default on resolve → `ORK1001`
  - No instance for named key → `ORK1002`
  - Cannot replace default → `ORK1003`
  - Cannot replace locked → `ORK1004`

## Usage
```ts
import { type RegistryPort, RegistryAdapter } from '@orkestrel/core'

interface Client { id: string }

// With protected default
const reg: RegistryPort<Client> = new RegistryAdapter<Client>({ label: 'client', default: { value: { id: 'default' } } })

// Add named entries
reg.set('east', { id: 'east-1' })

// resolve (throws if missing) vs get (optional)
const def = reg.resolve()        // { id: 'default' }
const east = reg.resolve('east') // { id: 'east-1' }
const west = reg.get('west')     // undefined

// Lock an entry and attempt replacement
reg.set('lock-me', { id: 'v1' }, true)
// reg.set('lock-me', { id: 'v2' })  // throws (ORK1004)

// Clear entries (locked requires force=true)
reg.clear('east')                 // true
reg.clear('lock-me')              // false (locked)
reg.clear('lock-me', true)        // true

// Default key is protected from clear and replacement
reg.clear()                       // false
// reg.set(Symbol.for('client.default'), { id: 'oops' }) // throws (ORK1003)

// Enumerate registered keys (includes the default symbol key)
const keys = reg.list()
```

## Notes
- Used internally for global `container()` and `orchestrator()` getters, and inside `Container` for provider registrations.
- Keys can be strings or symbols; defaults use a generated symbol if not provided.
- The adapter is environment-agnostic and works in Node and the browser.
