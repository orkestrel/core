---
applyTo: "**/eslint.config.{js,cjs,ts},**/eslint*.{js,cjs,ts}"
---

Purpose
- Central, reusable ESLint configuration for ESM + TypeScript.

Rules
- Prefer shared/base config pattern; extend rather than re-author.
- Import rules consistent with ESM `.js` suffix in relatives.
- Avoid broad disables; do not use /* eslint-disable */ at file top without rationale.

Checklist
- [ ] ESM + TS rules enabled
- [ ] Import rules enforce `.js` suffix on relatives
- [ ] No blanket disables
