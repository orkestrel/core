[**@orkestrel/core**](../index.md)

***

# Class: RegistryAdapter\<T\>

Defined in: [adapters/registry.ts:28](https://github.com/orkestrel/core/blob/98df1af1b029ad0f39e413b90869151f4152e5dd/src/adapters/registry.ts#L28)

Named instance registry with optional default and locking support.

Provides a type-safe registry for storing and retrieving named instances. Supports both
string and symbol keys. Optionally designates a default instance that cannot be replaced.
Individual entries can be locked to prevent replacement. Commonly used by Container and
Orchestrator for managing global instances.

## Example

```ts
import { RegistryAdapter } from '@orkestrel/core'
const reg = new RegistryAdapter<number>({
  label: 'config',
  default: { value: 42 }
})
reg.set('alt', 7, true) // locked=true prevents replacement
const def = reg.resolve()        // 42
const alt = reg.resolve('alt')   // 7
reg.clear('alt')                 // false (locked)
reg.clear('alt', true)           // true (forced)
```

## Type Parameters

### T

`T`

## Implements

- [`RegistryPort`](../interfaces/RegistryPort.md)\<`T`\>

## Constructors

### Constructor

> **new RegistryAdapter**\<`T`\>(`options`): `RegistryAdapter`\<`T`\>

Defined in: [adapters/registry.ts:46](https://github.com/orkestrel/core/blob/98df1af1b029ad0f39e413b90869151f4152e5dd/src/adapters/registry.ts#L46)

Construct a RegistryAdapter with optional label and default instance.

#### Parameters

##### options

[`RegistryAdapterOptions`](../interfaces/RegistryAdapterOptions.md)\<`T`\> = `{}`

Configuration options:
- label: Human-readable label used in error messages (default: 'registry')
- default: Optional default entry with value and optional key.
- logger: Optional logger port for diagnostics
- diagnostic: Optional diagnostic port for error reporting

#### Returns

`RegistryAdapter`\<`T`\>

## Accessors

### diagnostic

#### Get Signature

> **get** **diagnostic**(): [`DiagnosticPort`](../interfaces/DiagnosticPort.md)

Defined in: [adapters/registry.ts:68](https://github.com/orkestrel/core/blob/98df1af1b029ad0f39e413b90869151f4152e5dd/src/adapters/registry.ts#L68)

Access the diagnostic port used by this registry for error reporting.

##### Returns

[`DiagnosticPort`](../interfaces/DiagnosticPort.md)

The configured DiagnosticPort instance

***

### logger

#### Get Signature

> **get** **logger**(): [`LoggerPort`](../interfaces/LoggerPort.md)

Defined in: [adapters/registry.ts:61](https://github.com/orkestrel/core/blob/98df1af1b029ad0f39e413b90869151f4152e5dd/src/adapters/registry.ts#L61)

Access the logger port used by this registry.

##### Returns

[`LoggerPort`](../interfaces/LoggerPort.md)

The configured LoggerPort instance

## Methods

### clear()

> **clear**(`name?`, `force?`): `boolean`

Defined in: [adapters/registry.ts:157](https://github.com/orkestrel/core/blob/98df1af1b029ad0f39e413b90869151f4152e5dd/src/adapters/registry.ts#L157)

Clear a named instance from the registry.

The default instance is always protected and cannot be cleared. Locked instances
cannot be cleared unless force=true.

#### Parameters

##### name?

String or symbol key; when omitted, attempts to clear the default (always fails)

`string` | `symbol`

##### force?

`boolean` = `false`

When true, allows clearing a locked instance (default: false)

#### Returns

`boolean`

True if the instance was removed, false otherwise

#### Example

```ts
reg.clear('staging')           // removes if not locked
reg.clear('prod')              // false if locked
reg.clear('prod', true)        // true (forced removal)
```

#### Implementation of

[`RegistryPort`](../interfaces/RegistryPort.md).[`clear`](../interfaces/RegistryPort.md#clear)

***

### get()

> **get**(`name?`): `undefined` \| `T`

Defined in: [adapters/registry.ts:82](https://github.com/orkestrel/core/blob/98df1af1b029ad0f39e413b90869151f4152e5dd/src/adapters/registry.ts#L82)

Get a named value without throwing an error.

#### Parameters

##### name?

String or symbol key; when omitted, the default key is used

`string` | `symbol`

#### Returns

`undefined` \| `T`

The registered value, or undefined if not found

#### Example

```ts
const value = reg.get('myKey')
if (value) console.log('Found:', value)
```

#### Implementation of

[`RegistryPort`](../interfaces/RegistryPort.md).[`get`](../interfaces/RegistryPort.md#get)

***

### list()

> **list**(): readonly (`string` \| `symbol`)[]

Defined in: [adapters/registry.ts:178](https://github.com/orkestrel/core/blob/98df1af1b029ad0f39e413b90869151f4152e5dd/src/adapters/registry.ts#L178)

List all registered keys (including the default key symbol when present).

#### Returns

readonly (`string` \| `symbol`)[]

A read-only array of all registered keys (strings and symbols)

#### Example

```ts
const keys = reg.list()
console.log('Registered keys:', keys)
```

#### Implementation of

[`RegistryPort`](../interfaces/RegistryPort.md).[`list`](../interfaces/RegistryPort.md#list)

***

### resolve()

> **resolve**(`name?`): `T`

Defined in: [adapters/registry.ts:101](https://github.com/orkestrel/core/blob/98df1af1b029ad0f39e413b90869151f4152e5dd/src/adapters/registry.ts#L101)

Resolve a named value, throwing an error if not found.

#### Parameters

##### name?

String or symbol key; when omitted, resolves the default key

`string` | `symbol`

#### Returns

`T`

The registered value

#### Throws

Error with code ORK1001 if no default is registered when name is omitted

#### Throws

Error with code ORK1002 if the named instance is not found

#### Example

```ts
const value = reg.resolve('myKey') // throws if not found
const defaultValue = reg.resolve() // throws if no default
```

#### Implementation of

[`RegistryPort`](../interfaces/RegistryPort.md).[`resolve`](../interfaces/RegistryPort.md#resolve)

***

### set()

> **set**(`name`, `value`, `lock`): `void`

Defined in: [adapters/registry.ts:129](https://github.com/orkestrel/core/blob/98df1af1b029ad0f39e413b90869151f4152e5dd/src/adapters/registry.ts#L129)

Register or replace a named instance in the registry.

#### Parameters

##### name

String or symbol key for the instance

`string` | `symbol`

##### value

`T`

The instance to store

##### lock

`boolean` = `false`

When true, prevents further replacement for this key (default: false)

#### Returns

`void`

void

#### Throws

Error with code ORK1003 if attempting to replace the default instance

#### Throws

Error with code ORK1004 if attempting to replace a locked instance

#### Example

```ts
reg.set('prod', prodConfig)
reg.set('prod', newConfig, true) // locked=true prevents future replacement
```

#### Implementation of

[`RegistryPort`](../interfaces/RegistryPort.md).[`set`](../interfaces/RegistryPort.md#set)
