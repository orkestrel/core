# Ecosystem

Orkestrel Core focuses on small, composable primitives instead of a big framework. It’s designed to slot into your stack with minimal friction.

Where it fits
- Libraries and services that need explicit startup/shutdown with timeouts
- Apps that value compile-time contracts (tokens and ports) and clear wiring
- Multi-tenant or plugin-style apps that benefit from scoped containers

Interoperability
- Logging: implement `LoggerPort` to bridge to your logger (Winston/Pino/console) and pass it to Container/Orchestrator/Lifecycle.
- Metrics/Tracing: implement a `DiagnosticPort` or adapt the default `DiagnosticAdapter` to forward metrics/traces/events to your observability backend.
- Eventing: the event emitter and event bus ports are intentionally tiny; you can wrap other bus clients behind the same port shape.
- Tasking: plug in a custom `QueuePort` to drive hooks and orchestrator phases with your preferred scheduler.

Typical integrations
- Web servers: model servers as `Adapter` subclasses; register them in the container and start via the orchestrator. Use timeouts to guarantee bounded shutdown.
- Workers/daemons: group independent workers into layers and cap per-layer concurrency via a queue.
- Modular apps: publish shared contracts as port tokens and swap implementations per environment or tenant.

Out of scope
- HTTP routing, database clients, and other domain-specific features are intentionally out of Orkestrel Core. Treat those as adapters you wire in.

Versioning and stability
- Error codes and core semantics are intended to be stable within a major version. See the changelog and Typedoc for details.

If you publish community adapters or examples, consider using token-friendly shapes so others can adopt them without coupling to runtime details.
