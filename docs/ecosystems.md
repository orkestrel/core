# Ecosystems

How Orkestrel fits into different environments.

## Node (server)
- ESM-only package; use `type: "module"` in package.json.
- Works with NodeNext module resolution and `tsx` runner.
- `package.json` exports provide `dist/index.js` and `dist/index.d.ts` for Node/bundlers.

## Browser
- Code is environment-agnostic; avoid Node-only APIs in your adapters.
- Use bundlers (Vite, Webpack, Rollup) or modern browsers with ESM support.
- For browser-only adapters, see `@orkestrel/adapters/client` (in adapters package).

## Bundlers & Tooling
- TypeScript: `module` + `moduleResolution` = `NodeNext` works well.
- Test runners: `node:test`, Vitest, Jest (via ESM support) can run with `tsx` or transformed builds.
- Linting: any ESM-aware ESLint config works.

## Path Aliases & Index Shortening
- Local dev in this repo uses a TS path alias so examples/tests can import `@orkestrel/core` directly:
  - `paths: { "@orkestrel/core": ["src", "src/index.ts"] }`
- This makes editors happy (they often shorten `src/index.ts` to `src`).
- Consumers of the published package should simply import `@orkestrel/core`.

## Cross-environment Adapters
- Keep ports small and stable; implement adapters for each environment.
- The separate `@orkestrel/adapters` package exposes `.../client` and `.../server` subpaths for environment-specific picks.

