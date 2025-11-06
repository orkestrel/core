---
applyTo: "**/vite*.{ts,js},**/vitest.config.{ts,js}"
---

Purpose
- Reusable bundler/test-runner configuration.

Rules
- Keep ESM interop; align TS path alias (e.g. `@orkestrel/package`, if configured).
- Ensure coverage settings and test environment are consistent.
- Compatible with type emission via separate tsc build.

Checklist
- [ ] ESM and TS path alias alignment
- [ ] Consistent coverage and environment
- [ ] Works with separate type emission
