[**@orkestrel/core**](../index.md)

***

# Function: hasOwn()

## Call Signature

> **hasOwn**\<`K`\>(`obj`, `key`): `obj is Record<K, unknown>`

Defined in: [helpers.ts:167](https://github.com/orkestrel/core/blob/ccb170966790f428093f11a71a5646a6e842dbf9/src/helpers.ts#L167)

Narrow an unknown to an object that owns the given key(s) (non-prototype).

Overloads preserve the original type when known.

### Type Parameters

#### K

`K` *extends* `PropertyKey`

### Parameters

#### obj

`unknown`

Value to check

#### key

`K`

One or more keys to require on the object

### Returns

`obj is Record<K, unknown>`

True when obj is an object and owns all keys

### Example

```ts
if (hasOwn(x, 'id', 'name')) {
  // x: Record<'id' | 'name', unknown>
}
```

## Call Signature

> **hasOwn**\<`Ks`\>(`obj`, ...`keys`): `obj is { [P in PropertyKey]: unknown }`

Defined in: [helpers.ts:169](https://github.com/orkestrel/core/blob/ccb170966790f428093f11a71a5646a6e842dbf9/src/helpers.ts#L169)

Narrow an unknown to an object that owns the given key(s) (non-prototype).

Overloads preserve the original type when known.

### Type Parameters

#### Ks

`Ks` *extends* readonly `PropertyKey`[]

### Parameters

#### obj

`unknown`

Value to check

#### keys

...`Ks`

### Returns

`obj is { [P in PropertyKey]: unknown }`

True when obj is an object and owns all keys

### Example

```ts
if (hasOwn(x, 'id', 'name')) {
  // x: Record<'id' | 'name', unknown>
}
```

## Call Signature

> **hasOwn**\<`T`, `K`\>(`obj`, `key`): `obj is T & Record<K, unknown>`

Defined in: [helpers.ts:171](https://github.com/orkestrel/core/blob/ccb170966790f428093f11a71a5646a6e842dbf9/src/helpers.ts#L171)

Narrow an unknown to an object that owns the given key(s) (non-prototype).

Overloads preserve the original type when known.

### Type Parameters

#### T

`T` *extends* `object`

#### K

`K` *extends* `PropertyKey`

### Parameters

#### obj

`T`

Value to check

#### key

`K`

One or more keys to require on the object

### Returns

`obj is T & Record<K, unknown>`

True when obj is an object and owns all keys

### Example

```ts
if (hasOwn(x, 'id', 'name')) {
  // x: Record<'id' | 'name', unknown>
}
```

## Call Signature

> **hasOwn**\<`T`, `Ks`\>(`obj`, ...`keys`): `obj is T & { [P in PropertyKey]: unknown }`

Defined in: [helpers.ts:173](https://github.com/orkestrel/core/blob/ccb170966790f428093f11a71a5646a6e842dbf9/src/helpers.ts#L173)

Narrow an unknown to an object that owns the given key(s) (non-prototype).

Overloads preserve the original type when known.

### Type Parameters

#### T

`T` *extends* `object`

#### Ks

`Ks` *extends* readonly `PropertyKey`[]

### Parameters

#### obj

`T`

Value to check

#### keys

...`Ks`

### Returns

`obj is T & { [P in PropertyKey]: unknown }`

True when obj is an object and owns all keys

### Example

```ts
if (hasOwn(x, 'id', 'name')) {
  // x: Record<'id' | 'name', unknown>
}
```
