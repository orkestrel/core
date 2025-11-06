---
applyTo: "tsconfig.json,tsconfig.*.json"
---

Purpose
- Central TypeScript settings; strict and ESM-first.

Rules
- moduleResolution: bundler
- Relative imports must include `.js` in emitted ESM; code should use `.js` suffix in relatives.
- Prefer strict typing; avoid skipLibCheck unless constrained.
- Optionally map package/scoped alias, e.g. `@orkestrel/package` -> `./src/index.ts` for public API.

Build/types
- Use dedicated tsconfig.build.json to emit declaration files only after bundling.
- Emit types to dist.

Checklist
- [ ] Strict config and bundler resolution
- [ ] Alias mapped when used
- [ ] Build config emits types only to dist
