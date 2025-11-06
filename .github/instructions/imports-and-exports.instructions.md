---
applyTo: "src/**/*.ts"
---

Purpose
- Enforce `.js` suffix in relative imports, named exports, and barrel exposure.
- Keep shared modules environment-agnostic (isomorphic) across browser and server.

Rules
- No default exports.
- No CommonJS patterns.
- Always update barrel on public changes.
- Do not import Node-only modules (e.g., `fs`, `path`, `process`, `Buffer`, `readline`, `util`) in shared modules; isolate platform-specific code to `src/cli.ts` or dedicated server-only entrypoints.

Checklist
- [ ] `.js` on relative imports
- [ ] Named exports only
- [ ] Barrel updated
- [ ] No Node-only imports in shared modules