---
applyTo: "package.json"
---

Purpose
- Scripts, engines, and ESM module type.

Required
- type: module
- engines: Node >= 20
- scripts: build, test, check, format

Required scripts (must exist with these exact values)
```json
{
  "scripts": {
    "clean": "node -e \"try{require('fs').rmSync(process.argv[1],{recursive:true,force:true})}catch(e){}\"",
    "build": "npm run clean dist && vite build && tsc -p tsconfig.build.json",
    "check": "tsc --noEmit",
    "format": "eslint . --fix",
    "test": "vitest run",
    "prepublishOnly": "npm run check && npm run format && npm run test && npm run build"
  }
}
```

Required devDependencies (latest stable releases)
```json
{
  "devDependencies": {
    "@types/node": "^24.10.0",
    "eslint": "^9.39.0",
    "typescript": "^5.9.3",
    "vite": "^7.1.12",
    "vitest": "^4.0.6"
  }
}
```

Build flow
- Bundle with bundler; emit types with `tsc -p tsconfig.build.json` to dist after bundling.
- Prefer npm as the package manager.

Checklist
- [ ] Scripts present and match exactly
- [ ] Dev dependencies include required toolchain at listed versions
- [ ] Engines enforce Node >= 20
- [ ] `type` is `module`
