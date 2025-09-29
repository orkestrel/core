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

- ESM with NodeNext or Bundler module resolution
- Strict type checking

Example `tsconfig.json` (NodeNext):

```jsonc
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "lib": ["ESNext"],
    "types": ["node"]
  }
}
```

Alternative (Bundler) works great with Vite/Rollup/Webpack and `tsx`:

```jsonc
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "lib": ["ESNext"],
    "types": ["node"]
  }
}
```

Local development of this repo uses a path alias so examples/tests can import `@orkestrel/core` directly; consumers of the published package don’t need that alias. If you vendor or link this repo locally, you can add a path alias similarly:

```jsonc
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": { "@orkestrel/core": ["src/index.ts"] }
  }
}
```

Testing and scripts:

- We recommend `tsx` for running TypeScript directly (no ts-node needed).
- Use `tsc --noEmit -p <tsconfig>` for type-only checks.
