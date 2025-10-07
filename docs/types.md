# Types and Guidelines

This project is TypeScript-first. Follow these guidelines when using and extending the core.

- Tokens: Use `createToken<T>(description)` to define unique runtime identifiers for your ports. Keep `T` as the interface you depend on.
- Providers: `useValue`, `useFactory`, and `useClass` are supported. Factories must be synchronous. If you need async work, do it inside a `Lifecycle` hook (e.g., `onStart`) instead of returning a Promise from `useFactory`.
- Inject: Prefer tuple inject for positional dependencies and object inject for named dependencies. The types infer correctly for both.
- Readonly data: Prefer `readonly`/`ReadonlyArray` in your public types to signal immutability.
- Narrowing: Use the provided type guards (e.g., `isFactoryProviderWithTuple`) when you need to refine provider shapes.
- Lifecycle: If your component manages resources, extend `Adapter` (which extends `Lifecycle`) so it participates in orchestrated start/stop/destroy.
- Maps of tokens: Use `createPortTokens` and `extendPorts` to produce stable token maps with inferred types; avoid ad-hoc string keys.

See `src/types.ts` for the canonical type definitions.
