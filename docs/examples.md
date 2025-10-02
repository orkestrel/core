# Examples

Two practical adapters show Lifecycle around an HTTP server and a worker loop.

- Web server example: starts an http.Server, logs start/stop, and cleans up gracefully.
  - Run: `npm run example:web`
  - Source: `examples/web-server.ts`

- Worker example: runs a periodic loop (setInterval), logs ticks, and stops on destroy.
  - Run: `npm run example:worker`
  - Source: `examples/worker.ts`

Each example demonstrates:
- Tokens and registrations with explicit `inject` for constructor dependencies.
- Orchestrator `start([...])` for composition and a single `destroy()` for shutdown.
- Lifecycle hooks for resource acquisition/release and logging.

