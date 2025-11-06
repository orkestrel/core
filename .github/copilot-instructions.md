# Repository Instructions for GitHub Copilot

Purpose: Help Copilot work as an extension of the developer across repositories by following consistent code design, project structures, and coding conventions. Understand what is required, what is optional, and what is found.

Summary
- Stack: TypeScript (ESM) library that is environment-agnostic (browser and server). Node.js is used for tooling, tests, and optional CLI only.
- Style: Accuracy over latency; small, modular files; strict typing; deterministic behavior.
- Shell: Use PowerShell in all examples (Windows paths with backslashes, chain commands with semicolons).
- Governance: See `plan/overview.md` and `plan/phase-*.md` for architecture, phases, acceptance criteria, and handoffs (when present). When `ideas.md` exists, it is the single source of truth for phased implementation tracking.

## Goals and principles
- Determinism: same inputs → same outputs; keep ordering and comparison options stable.
- Strict typing: no `any`, no non‑null assertions (`!`), avoid unsafe casts; narrow from `unknown`.
- Small surface: prefer tiny, composable helpers; expand public API only with multi-site need.
- Portability: browser + Node compatible; avoid Node-only primitives in public APIs.

## Assistant behavior (always)
- Act as an extension of the developer: follow existing patterns, structure, and configuration.
- Prefer reuse and centralization: shared types in `src/types.ts`, helpers in `src/helpers.ts`, constants in `src/constants.ts`. These centralized files exist to extract and import logic relevant to other modules, making it easy to deduplicate logic and ensure related modules have strong connections that are easy to find.
- Keep changes minimal; do not introduce new dependencies or folders unless requested.
- Update `src/index.ts` barrel whenever the public API changes. Use `export * from './module.js'` pattern to expose all exports—do not curate or hide internals. Developers need access to all types and tools for customization.
- ESM-only code; PowerShell for terminal examples; Windows-style paths in documentation.
- Environment-agnostic by default: author library modules to run in both browser and server without shims. Avoid Node-only APIs and globals (`process`, `Buffer`, `fs`, etc.) in shared modules. Isolate Node usage to `src/cli.ts` (or clearly server-only entrypoints) and tests.
- Keep diffs focused. Expand public API only with rationale and multi-site need.
- Add and update mirrored tests for any source change.
- Update TSDoc and guides/examples when behavior changes.
- Prefer small extensions to existing shapes over new abstractions.
- **Leave TODO comments** for stale/legacy code and files that need removal or deletion, especially if leaving them to avoid breaking tests. Also leave TODOs for code or files you feel are necessary to preserve for context or structure understanding.

## Build, test, run (always validate locally)
- Install (first time or after deps change):
  ```powershell
  npm install
  ```
- Typecheck (no emit):
  ```powershell
  npm run check
  ```
- Lint and autofix:
  ```powershell
  npm run format
  ```
- Build library:
  ```powershell
  npm run build
  ```
- Tests (Vitest):
  ```powershell
  npm test
  ```
- Example run (only when a CLI exists):
  ```powershell
  node dist\cli.js --help
  ```

## Repository layout (required vs optional)
- Required
  - `src/` — single-responsibility modules (single-word filenames where practical).
    - `src/index.ts` — barrel exports only (no logic) [required].
    - `src/types.ts` — centralized exported types/interfaces [when needed].
    - `src/helpers.ts` — centralized shared helpers/utilities [when needed].
    - `src/constants.ts` — immutable shared constants [when needed].
    - `src/cli.ts` — command-line entrypoint (server-only; may use Node built-ins) [only when a CLI is needed].
  - `tests/` — mirrors `src/` structure; one test file per source module.
- Optional/Contextual
  - `ideas.md` — single-file phased implementation tracker (when present, replaces plan/ folder).
  - `guides/` — retrospective docs for completed/mostly built projects.
  - `plan/` — phased implementation plans, acceptance criteria, contracts.
  - `examples/` — optional fixtures/samples to test or try ideas.
  - `output/` — generated artifacts created by the app/CLI as needed.
  - `dist/` — build output (generated, not committed).
- Do not create optional folders unless requested; adapt to what is present in the repo.
- Do not add CI workflows in repos that explicitly avoid them; rely on local gates (`check`, `test`, `build`, `format`) unless stated otherwise.

## Ideas.md (single-file phased implementation tracker)
When `ideas.md` exists at the repository root, it serves as the **single source of truth** for implementation planning, phase tracking, and acceptance criteria. It replaces the need for multiple `plan/` files and keeps all project tracking in one living document.

### Purpose and philosophy
- **Single source of truth:** All ideas, analysis, phases, acceptance criteria, and progress tracking in one file.
- **Living document:** Updated continuously as work progresses; phases marked complete with checkboxes and status emojis.
- **Context-rich:** Contains rationale, trade-offs, deferred items, and implementation details all together.
- **Reward-driven prioritization:** Ideas ranked by reward/complexity ratio, not arbitrary ordering.
- **No duplication:** Avoids maintaining multiple plan files, meeting notes, or scattered tracking.

### Structure and conventions
An `ideas.md` file typically contains:

1. **Header with metadata:**
   - Title describing the project/feature set
   - Last updated date
   - Analysis source (what informed the ideas)
   - Overall implementation status

2. **Progress tracking table:**
   - Phase name and number
   - Status (✅ Complete, 🔄 In Progress, 🔲 Not Started, ⏸️ Deferred)
   - Completion percentage
   - Key deliverables summary

3. **Executive summary:**
   - High-level overview of goals
   - Methodology and timeline
   - What the document provides (rankings, recommendations, phases)

4. **Ideas ranked by reward/complexity ratio:**
   - Tiered structure (Tier 1: High reward/low complexity → Tier 4: Low reward/high complexity)
   - Each idea includes:
     - Star rating (⭐⭐⭐⭐⭐ for highest priority)
     - Reward level (Very High, High, Medium, Low)
     - Complexity level (Very Low, Low, Medium, High, Very High)
     - Estimated effort (hours/days)
     - **Recommendation:** Clear RECOMMENDED/DEFER/NOT RECOMMENDED decision with rationale
     - **What:** Concise description of the change
     - **Why Recommended/Deferred/Rejected:** Explicit reasoning
     - **Trade-offs:** Honest assessment of downsides
     - **Implementation:** Code examples, file paths, patterns to follow

5. **Phased implementation plan:**
   - Phases numbered sequentially (Phase 0, 1, 2, etc.)
   - Each phase contains:
     - **Objective:** What this phase accomplishes
     - **Duration estimate:** Days/hours
     - **Tasks:** Numbered sub-tasks (e.g., 1.1, 1.2) with:
       - Files to create/modify
       - Implementation snippets
       - Tests to create
       - Acceptance criteria (checkbox list)
     - **Progress tracking section** with checkbox list
     - **Validation commands** to verify completion

6. **Completion markers:**
   - Phases marked ✅ COMPLETED when finished
   - Checkboxes for granular task tracking
   - Notes on what was implemented vs. deferred

### Assistant behavior with ideas.md
When working in a repository with `ideas.md`:

- **Always read ideas.md first** before starting implementation work.
- **Check the progress tracking table** to understand which phase is active.
- **Follow the implementation patterns** provided in each idea's details.
- **Update progress checkboxes** as tasks are completed.
- **Add notes** to phase tracking sections when deviating from the plan or discovering issues.
- **Mark phases complete** (change status to ✅ COMPLETED) only when ALL acceptance criteria are met.
- **Do not create plan/ folder** if ideas.md exists—it replaces that structure.
- **Preserve the rationale sections**—they provide crucial context for future decisions.
- **Keep ideas.md updated** as the single living document; do not split information into separate files.
- **Respect tier rankings**—do not implement Tier 3/4 ideas without explicit approval.
- **Reference specific sections** when asking questions (e.g., "Per Phase 2, Task 2.1...").

### When to use ideas.md vs plan/ folder
- **Use ideas.md when:**
  - Project is in active exploration/implementation phase
  - Frequent iteration and re-prioritization expected
  - Single maintainer or small team wants unified view
  - Want to keep all context and decisions in one place
  - Complexity analysis and trade-offs are important to preserve

- **Use plan/ folder when:**
  - Project is large with multiple independent work streams
  - Multiple teams need separate phase documents
  - Formal governance and handoff contracts required
  - Retrospective guides (guides/) will eventually document the finished system

### Validation and quality gates
When updating ideas.md:
- Keep the progress tracking table synchronized with phase sections
- Maintain checkbox accuracy (checked = truly complete)
- Update "Last Updated" date when making significant changes
- Preserve all historical notes and completion markers
- Ensure code examples remain valid as implementation evolves

## Coding standards (must follow)
- TypeScript
  - No `any`. No non-null assertions (`!`). Do not use type assertions (`as` or `<T>value`).
  - Prefer user-defined type guards with `is`: `function isX(v: unknown): v is X { ... }` (no mutation inside guards).
  - Write small, composable type guards for narrowing; export guards alongside the APIs they validate.
  - Prefer positive guards over negative complements (TS cannot express exact set complements for most types).
  - Provide function overloads only when it improves clarity; keep them minimal and well-documented.
  - Validate at edges (accept `unknown`, narrow, then use). Prefer `readonly` outputs.
  - Relative ESM imports must include `.js` in paths (e.g., `import { x } from './foo.js'`). Prefer named exports; avoid default exports.
  - Keep types honest: model nullability/optionality explicitly (`T | undefined` / optional fields).
  - Constrain generics to the minimum needed (e.g., `<T extends object>`). Avoid unconstrained `<T>`.
  - Use `as const` where appropriate to preserve literal inference in examples and tests.
- Runtime neutrality (isomorphic design)
  - Library modules must not import Node built-ins or rely on Node globals. Prefer Web Platform APIs, small abstractions, or dependency-injected capabilities.
  - If a platform-specific feature is needed, define a small interface and accept an implementation from callers; provide Node-only implementations only in `src/cli.ts` or tests.
  - Avoid side effects at import time; keep modules SSR-friendly.
  - Keep providers/factories synchronous in core-style repos; move IO to lifecycle hooks.
- Naming
  - Use clear words; avoid abbreviations unless universal (e.g., URL, ID). Single-letter vars only in tiny, obvious scopes.
  - Public methods: one word, two at most if truly necessary. Private methods: 2–3 words allowed.
- Encapsulation
  - Use `#` private fields (runtime-enforced). Expose via getters/setters if truly needed; keep public surface minimal.
  - Public getters should not expose mutable references; return copies or readonly views.
- Organization
  - No top-level mutable state. Shared constants in `src/constants.ts`.
  - Keep helpers small and well-typed; document invariants where helpful.
  - Keep helpers in `src/helpers.ts` and test them in `tests/helpers.test.ts`.
  - Export all public symbols via `src/index.ts` (barrel). Types in `src/types.ts`.
  - Avoid ambient/global types. Keep exports explicit and tree-shake friendly.
  - Keep constructor/factory inputs simple (tuple/object injection patterns for DI-style code).
- ESLint/TS
  - Project is strict (see `eslint.config.ts`, `tsconfig.json`). Do not add `as` or disable rules without rationale.
  - Enable strict suite in tsconfig: `"strict": true`, `"noImplicitAny": true`, `"noUncheckedIndexedAccess": true`, `"exactOptionalPropertyTypes": true`, `"noImplicitOverride": true`, `"useUnknownInCatchVariables": true`.
  - Prefer modern module resolution: `"moduleResolution": "bundler"` in ESM-only packages.
  - Keep declaration output clean: `"declaration": true`, `"stripInternal": true` for public packages.

## Options objects and typing
- Define a named `...Options` interface in `src/types.ts` for any exported function/class options.
- Document options as a single `@param` and list fields in the description or `@remarks` (TSDoc does not support dotted `@param`).
- Prefer boolean/enum flags that are orthogonal and stable; avoid ambiguous overloads when a single options object will do.
- For discriminated unions, use explicit discriminants and helpers (e.g., `literalOf`, `discriminatedUnion`) instead of fragile tag checks.

## Immutability and collections
- Prefer `readonly T[]` and `ReadonlyArray<T>` for arrays; `ReadonlyMap<K, V>` and `ReadonlySet<T>` for collections.
- Do not mutate inputs; copy-on-write for internal state as needed. For performance-sensitive code, document any deliberate mutations and keep them internal.
- Be explicit about number semantics (e.g., strict numbers: `+0 !== -0`, `NaN === NaN` in deep equality).
- Document collection ordering semantics for Map/Set comparisons; surface flags like `compareMapOrder`/`compareSetOrder`.

## Error and diagnostics typing
- Define stable, structured error metadata (expected, path, label, receivedType/tag/preview, hint, helpUrl). Keep fields readonly.
- Where applicable, expose helpers to render locations (path arrays → strings) deterministically and cycle-safe previews that do not leak secrets.
- Assertions throw `TypeError` with structured metadata; tests pinpoint failing indices/keys via path.

## Testing conventions (fast, deterministic)
- Mirror source: `tests/[file].test.ts` for every `src/[file].ts`.
- Vitest for runner/assertions; prefer real small scenarios over heavy mocks.
- Deterministic timing; short timers. One top-level `describe()` per file; nested `describe()` per function/feature.
- Focused, descriptive test cases; cover happy path plus key edge cases (timeouts, retries, backoff).
- Tests run in Node by default, but should exercise the public API in a runtime-neutral way. Avoid depending on Node-only globals/APIs unless testing the CLI.
- Ensure `npm run check`, `npm test`, and `npm run build` are green before committing.
- Keep `npm run check` clean alongside unit tests.
- Favor small compile-time "example" snippets in TSDoc that the typechecker validates.
- **Never skip tests or create placeholder tests that pass.** Use `it.todo('descriptive test case')` for unimplemented tests. When implementing logic, convert todos to real tests. Search for remaining `it.todo` before marking features complete.

## TSDoc and documentation
- Public exported classes/functions require full TSDoc with `@example` fenced as `ts`.
- Do not add full TSDoc banners to types/interfaces; keep comments concise.
- For options objects, avoid dotted `@param`; list fields under `@remarks`.
- Keep examples copy‑pasteable.
- Use `ts` fences and avoid leaking secrets or large payloads in previews.

## Quality gates (must pass before PR)
- Build: `npm run build`
- Lint/Typecheck: `npm run check` and `npm run format`
- Unit tests: `npm test`
- Smoke test: when a CLI exists, run a relevant subcommand on `examples\` and ensure outputs in `output\`
- Style compliance: file placement (types/constants/helpers), barrel exports updated, naming/typing rules (no `as`, no `!`).

## Task scoping and PR etiquette (from GitHub docs best practices)
- Prefer well-scoped tasks with acceptance criteria; call out which files to change.
- Start with safer tasks (bug fixes, tests, docs, small refactors). Defer ambiguous or production-critical tasks.
- Iterate via PR review comments; batch feedback when possible. Keep PR title/body updated to reflect current changes.

## Copilot Coding Agent expectations
- Before coding: run the setup steps in `.github/workflows/copilot-setup-steps.yml` if present, then run `npm run check`, `npm test`, `npm run build`, and `npm run format`.
- When generating code:
  - Add and update mirrored tests.
  - Respect strict typing; no `any`, no `!`.
  - Keep ESM-only imports/exports.
  - Follow TSDoc policy and use ```ts examples.
  - When scaffolding tests for unimplemented features, use `it.todo('descriptive test case')` instead of placeholder tests that pass.
  - When implementing logic, check for related `it.todo()` and convert them to real tests.
  - Before completing a feature, search for remaining `it.todo()` related to that feature and implement missing tests.
- When editing docs:
  - Keep examples copy‑pasteable.
  - Use `ts` fences and avoid leaking secrets or large payloads in previews.

## Gotchas and tips
- ESM only. Avoid CommonJS-only patterns. Target modern Node/browsers.
- Environment-agnostic first: avoid `fs`, `path`, `process`, `Buffer`, and other Node-only APIs in shared modules. Isolate such usage to `src/cli.ts` or test scaffolding.
- Paths: use Windows examples with backslashes in docs/commands.
- Prefer package/scoped alias, e.g. `@orkestrel/package`, path alias to import the public API in tests/examples when configured; otherwise use relative imports with `.js` extensions.
- When the repo provides reusable config builders (e.g., a Vite/Vitest config helper and an ESLint config helper), import and extend them rather than re-authoring configs.
- Type lifecycle hooks precisely; include per-phase timeout options as named fields in options types.

## If unsure
- When `ideas.md` exists, treat it as the single source of truth for implementation tracking, phased work, and acceptance criteria. It supersedes the `plan/` folder structure.
- When using `plan/` structure, prefer checking `plan/overview.md` and the relevant `plan/phase-*.md` file for the current phase's contracts, checklists, and acceptance criteria before making changes.
