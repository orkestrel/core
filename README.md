# Orkestrel Core

Minimal, strongly-typed adapter/port toolkit for TypeScript. Compose capabilities with tokens, wire implementations via a tiny DI container, and drive lifecycles deterministically with an orchestrator.

- Package: `@orkestrel/core`
- TypeScript-first, ESM-only
- Works in Node and the browser

Quick links
- Overview: [docs/overview.md](docs/overview.md)
- Install: [docs/install.md](docs/install.md)
- Start (Getting Started): [docs/start.md](docs/start.md)
- Concepts: [docs/concepts.md](docs/concepts.md)
- Patterns: [docs/patterns.md](docs/patterns.md)
- Tips: [docs/tips.md](docs/tips.md)
- Ecosystems: [docs/ecosystems.md](docs/ecosystems.md)
- Examples: [docs/examples.md](docs/examples.md)
- API Reference: [docs/api.md](docs/api.md)
- Contribute: [docs/contribute.md](docs/contribute.md)

Recommendation
- Prefer `orchestrator.start([...])` at your app entry to declare registrations and start lifecycles in one step. See [Start](docs/start.md) and [Patterns](docs/patterns.md).

Source
- Public entrypoint: `src/index.ts`
- Browse source: [`src/`](src)

Run locally
```sh
npm ci
npm run check
npm test
npm run example:simple
npm run example:large
```

Publishing
- `prepublishOnly` runs type-checks and build so only `src` is compiled to `dist`.

Issues & Discussions
- Please file issues and PRs with clear reproduction and expected behavior.
