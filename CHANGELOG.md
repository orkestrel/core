# Changelog

All notable changes to this project will be documented in this file.

## 2.1.0 - 2025-10-13

Public API changes (validators/guards consolidation)
- Moved common validators and guards to the dedicated `@orkestrel/validator` package. The following helpers are no longer exported from `@orkestrel/core/helpers` and should be imported from `@orkestrel/validator` instead:
  - `isObject`, `isString`, `isBoolean`, `isFunction`, `arrayOf`, `literalOf`, `hasSchema`, `isNumber` (finite), `hasOwn`, `getTag`, `isAsyncFunction`, `isPromiseLike`, `isZeroArg` and related primitives
- The previous `isFiniteNumber` helper has been removed; use `isNumber` from `@orkestrel/validator`.
- Project-specific helpers remain unchanged: token creators (`createToken`, `createTokens`), token guards (`isToken`, `isTokenArray`, `isTokenRecord`), provider shape guards (`isValueProvider`, `isFactoryProvider*`, `isClassProvider*`), `safeInvoke`, `tokenDescription`, `matchProvider`, `isProviderObject`, `isRawProviderValue`, `isLifecycleErrorDetail`, `isAggregateLifecycleError`.

Migration
- Replace imports of general-purpose guards from `@orkestrel/core` with `@orkestrel/validator`:
  - Before: `import { arrayOf, literalOf, hasSchema, isFiniteNumber } from '@orkestrel/core'`
  - After:  `import { arrayOf, literalOf, hasSchema, isNumber } from '@orkestrel/validator'`

Notes
- No behavior changes to container/orchestrator/adapters. This release streamlines validator usage across the codebase.

## 2.0.0 - 2025-10-10

- New major version. Public API remains focused and ESM-only.
- Cleaned up package metadata: add MIT license, include LICENSE and CHANGELOG in published files.
- Verified build outputs (ESM bundle with sourcemaps) and type declarations.
- Ensured comprehensive test coverage remains green.

Notes
- v2 is not concerned with backwards compatibility for v1 consumers.
