# Install

Orkestrel Core is published as an ESM-only TypeScript package.

- Package: `@orkestrel/core`
- Node: v18+ recommended
- TypeScript: v5+

Install:

```sh
npm install @orkestrel/core
```

TypeScript config suggestions:

- ESM with NodeNext resolution (works great with tsx, Vitest, node:test, etc.)
- Strict type checking

Example `tsconfig.json`:

```jsonc
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
```

Local development of this repo uses an alias so examples/tests can import `@orkestrel/core` directly; consumers of the published package don’t need that alias. If you vendor or link this repo locally, you can add a path alias similarly:

```jsonc
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": { "@orkestrel/core": ["src", "src/index.ts"] }
  }
}
```

Testing and scripts:

- We recommend `tsx` for running TypeScript directly (no ts-node needed).
- Use `tsc --noEmit -p <tsconfig>` for type-only checks.

