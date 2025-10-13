# Copilot Instructions for @orkestrel/core

## Repository Overview

**@orkestrel/core** is a minimal, strongly-typed dependency injection and lifecycle management toolkit for TypeScript. It provides a tiny DI container, deterministic orchestration, and ports/adapters pattern for building composable applications.

- **Size**: Small (~48 TypeScript files, ~200KB source, ~140KB tests)
- **Type**: TypeScript library published as ESM package
- **Target**: Node.js 18+ and browser environments
- **Package**: `@orkestrel/core` v2.0.1
- **License**: MIT

## Key Architectural Constraints

**CRITICAL - These are enforced by the codebase:**
1. **Providers must be synchronous** - No `async` factories, no Promise values (enforced with runtime guards throwing ORK1010/ORK1011/ORK1012)
2. **Async work goes in lifecycle hooks** - Use `onStart`, `onStop`, `onDestroy` methods in `Lifecycle` or `Adapter` classes
3. **Deterministic ordering** - Preserve insertion order and declared dependency order throughout
4. **Strict typing** - Zero `any`, no non-null assertions (`!`), prefer `readonly` for public outputs
5. **Browser + Node compatible** - No Node-only primitives in core adapters or public APIs
6. **ESM-only** - `"type": "module"` in package.json, moduleResolution: bundler

## Build & Validation Workflow

**ALWAYS install dependencies first:**
```bash
npm install
```

**Command order for validation (run in this sequence):**

1. **Typecheck** (fast, ~1-2s):
   ```bash
   npm run check
   ```
   - Uses `tsc -p tsconfig.json` with `noEmit: true`
   - Checks src/, tests/, and config files
   - Must pass before proceeding

2. **Unit tests** (fast, ~3s, 167 tests):
   ```bash
   npx tsx --test tests/*.test.ts
   ```
   **Note**: The package.json script uses Windows path separator (`tests\**\*.ts`) which fails on Linux. Use the npx command above on Linux systems.
   - Tests mirror source files: `tests/[file].test.ts`
   - All tests use real in-memory adapters (no mocks/spies)
   - Must pass before committing

3. **Lint and autofix** (medium, ~5-10s):
   ```bash
   npm run format
   ```
   - Runs `eslint . --fix` with strict TypeScript and TSDoc rules
   - Auto-fixes style issues
   - Enforces TSDoc policy (see below)

4. **Build** (medium, ~10-15s):
   ```bash
   npm run build
   ```
   - Clears dist/ directory
   - Runs Vite to bundle ESM to `dist/index.js` with sourcemap
   - Runs `tsc -p tsconfig.build.json` to emit type declarations to `dist/index.d.ts`
   - Output: ~80KB gzipped ESM bundle + type declarations

5. **Generate docs** (slow, ~20-30s):
   ```bash
   npm run docs:api
   npx tsx scripts/generate-llms.ts --base-url https://github.com/orkestrel/core/blob/main/docs --docs docs --out docs --keep-extensions
   ```
   **Note**: The package.json `docs:llm` script uses Windows path separator (`scripts\generate-llms.ts`) which fails on Linux. Use the npx command above on Linux systems.
   - TypeDoc generates API reference to `docs/api/`
   - Custom script generates `docs/llms.txt` and `docs/llms-full.txt`
   - Only needed if public API changes

## Project Layout

### Root Files
- `package.json` - ESM-only, Node 18+ requirement, build scripts
- `tsconfig.json` - Strict TypeScript config with moduleResolution: bundler
- `tsconfig.build.json` - Extends tsconfig.json, emits declarations to dist/
- `eslint.config.mjs` - Nuxt ESLint base + strict TypeScript + TSDoc enforcement
- `vite.config.ts` - Vite config for ESM bundling to dist/
- `typedoc.json` - TypeDoc config for API documentation
- `.gitignore` - Excludes node_modules/, dist/, tmp/, .vscode/, etc.

### Source Structure (`src/`)
- `index.ts` - Main export barrel file
- `types.ts` - Core type definitions (Token, Provider variants, etc.)
- `constants.ts` - Diagnostic message definitions (ORK codes)
- `helpers.ts` - Type guards and utility functions
- `container.ts` - DI container implementation (~19KB)
- `lifecycle.ts` - Lifecycle base class (~12KB)
- `adapter.ts` - Adapter base class (extends Lifecycle)
- `orchestrator.ts` - Orchestrator for managing multiple components (~31KB)
- `ports.ts` - Port token utilities
- `adapters/` - Built-in adapters:
  - `diagnostic.ts` - Diagnostic message collection
  - `emitter.ts` - Event emitter
  - `event.ts` - Event bus
  - `layer.ts` - Topological layer grouping
  - `logger.ts` - Logger adapters (Noop, Fake)
  - `queue.ts` - Task queue with concurrency/timeout
  - `registry.ts` - Named instance registry

### Test Structure (`tests/`)
- Mirrors src/ structure: one test file per source file
- Test files: `*.test.ts` (e.g., `container.test.ts`, `orchestrator.test.ts`)
- All tests use Node's native test runner via `tsx --test`
- 167 total tests covering success/failure/timeout/concurrency/ordering

### Documentation (`docs/`)
- `guide/` - Comprehensive guides:
  - `overview.md` - Project overview and key concepts
  - `start.md` - Installation and quickstart
  - `concepts.md` - Tokens, providers, lifecycle, orchestration
  - `core.md` - Built-in adapters details
  - `examples.md` - Copy-pasteable code examples
  - `tips.md` - Patterns and troubleshooting
  - `tests.md` - Testing guidance
  - `contribute.md` - **Most important for coding agents** - workflow, typing rules, TSDoc policy, architectural constraints
  - `faq.md` - Common questions
- `api/` - Generated TypeDoc reference (140+ markdown files)
- `llms.txt` / `llms-full.txt` - LLM-optimized documentation

### Configuration Files
- ESLint: `eslint.config.mjs` - Enforces no `any`, no `!`, TSDoc requirements
- TypeScript: `tsconfig.json` (dev) + `tsconfig.build.json` (emit)
- Vite: `vite.config.ts` - ESM bundling configuration
- TypeDoc: `typedoc.json` - API docs generation

## TSDoc Policy (STRICTLY ENFORCED BY ESLINT)

**Public exported items require full TSDoc:**
- Classes and their public methods: description, `@param`, `@returns`, `@example`, optional `@remarks`
- Exported functions: same as above
- Simple getters/setters: description and `@returns` only (no `@example`)

**Code examples must use fenced blocks with `ts` tag:**
```ts
// Example code here
```

**Types and interfaces: NO TSDoc** - Remove header/banner comments on types/interfaces

**Options objects:**
- Do NOT use dotted `@param` names (e.g., `@param opts.foo` - triggers linter error)
- Document the object parameter once, list properties in description:
```typescript
/**
 * Construct a Thing.
 *
 * @param opts - Configuration options:
 * - parent: Optional parent container
 * - logger: Optional logger port
 */
constructor(opts: ThingOptions = {}) { }
```

**Private methods/non-exported items: single-line comment only** (no TSDoc block)

## Common Issues & Workarounds

### Issue 1: Test command fails on Linux
**Error**: `Could not find '/home/runner/work/core/core/tests***.ts'`  
**Cause**: Windows path separator in package.json script  
**Solution**: Use `npx tsx --test tests/*.test.ts` instead of `npm test`

### Issue 2: docs:llm fails on Linux
**Error**: `Cannot find module '/home/runner/work/core/core/scriptsgenerate-llms.ts'`  
**Cause**: Windows path separator in package.json script  
**Solution**: Use `npx tsx scripts/generate-llms.ts [args]` instead of `npm run docs:llm`

### Issue 3: Clean install needed
**Error**: Type definition errors or module not found  
**Solution**: Always run `npm install` first in a fresh clone

### Issue 4: Async provider detection
**Error**: Runtime error with ORK1010/ORK1011/ORK1012 diagnostic codes  
**Cause**: Provider function is async or returns Promise  
**Solution**: Move async work to lifecycle hooks (`onStart`, `onStop`, `onDestroy`)

## Diagnostic Codes Reference

- **ORK1006**: Missing provider (unknown token)
- **ORK1008**: Unknown dependency in provider inject
- **ORK1009**: Circular dependency detected
- **ORK1010/1011/1012**: Async provider detected (factory/value is Promise or async)
- **ORK1013**: Aggregate error on start
- **ORK1014**: Aggregate error on stop
- **ORK1017**: Aggregate error on destroy
- **ORK1020**: Invalid lifecycle transition
- **ORK1021**: Lifecycle hook timeout
- **ORK1022**: Lifecycle hook failure

## No CI/CD Workflows

**This repository has NO GitHub Actions or CI workflows.** All validation happens locally:
- Do NOT add `.github/workflows/` files
- Do NOT suggest CI/CD setup
- All gates are enforced locally via npm scripts before publishing

The `prepublishOnly` script runs the full validation chain:
```bash
npm run check && npm run format && npm run test && npm run docs && npm run build
```

## Making Changes - Quick Reference

**For source code changes:**
1. Edit file in `src/`
2. Add/update test in `tests/[file].test.ts`
3. Run: `npm run check` (typecheck)
4. Run: `npx tsx --test tests/*.test.ts` (tests)
5. Run: `npm run format` (lint+fix)
6. If public API changed: `npm run docs:api`

**For test changes:**
1. Edit test in `tests/`
2. Run: `npm run check` (typecheck)
3. Run: `npx tsx --test tests/*.test.ts` (verify)

**For documentation changes:**
1. Edit file in `docs/guide/`
2. No build needed (pure markdown)
3. Optionally regenerate LLM docs: `npx tsx scripts/generate-llms.ts --base-url https://github.com/orkestrel/core/blob/main/docs --docs docs --out docs --keep-extensions`

## Trust These Instructions

These instructions have been validated by running all commands in sequence on a fresh clone. If you find an error or omission, you may search the codebase for clarification, but otherwise **trust these instructions** to minimize exploration time.
