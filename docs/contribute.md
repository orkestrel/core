# Contribute

Thanks for your interest in contributing to Orkestrel Core!

## Repo Setup

```sh
npm ci
```

Useful scripts:
- `npm run build` — compile `src` to `dist`
- `npm test` — run tests with `tsx --test`
- `npm run check` — type-check src, examples, and tests
- `npm run format` — ESLint autofix
- `npm run example:simple` — run simple example
- `npm run example:large` — run large example

## Development Workflow

1) Edit source in `src/`
2) Add/adjust tests in `tests/`
3) Run `npm test` locally
4) Type-check everything with `npm run check`
5) Build with `npm run build`

## Project Conventions

- TypeScript-first, ESM-only (`"type": "module"`)
- NodeNext module resolution
- Strict typing; avoid `any` unless at boundaries
- Keep adapters side-effect free on import
- Prefer explicit DI; helpers are for app glue, not libraries
- Core tests must use real components only (no fakes/mocks/spies). Doubles are for external dependencies in consumer apps.

## Release

- The `prepublishOnly` script ensures `check` + `build` run before publishing
- Only `src` is compiled to `dist`; examples and tests are for development

## Documentation

- Top-level guides live in `docs/` with single-word filenames
- README is a concise index; deep dives live in the docs
- When adding new APIs, update `docs/api.md` with signatures and examples

## Code of Conduct

Be kind. Assume good intent. Discuss ideas, not individuals.
