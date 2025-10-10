**@orkestrel/core**

***

# Orkestrel Core

Minimal, strongly-typed adapter/port toolkit for TypeScript. Compose capabilities with tokens, wire implementations via a tiny DI container, and drive lifecycles deterministically with an orchestrator.

- Package: `@orkestrel/core`
- TypeScript-first, ESM-only
- Works in Node and the browser (Node 18+)

## Install
```sh
npm install @orkestrel/core
```

## Documentation
- Overview: docs/guide/overview.md
- Start: docs/guide/start.md
- Concepts: docs/guide/concepts.md
- Core: docs/guide/core.md
- Examples: docs/guide/examples.md
- Tips: docs/guide/tips.md
- Tests: docs/guide/tests.md
- Contribute: docs/guide/contribute.md
- FAQ: docs/guide/faq.md
- API: docs/api/index.md
- LLM: docs/llms.txt
- LLM Full: docs/llms-full.txt

Notes
- Providers are synchronous (no async factories or Promise values). Do async work in Lifecycle hooks.
- Deterministic start/stop/destroy order with timeouts and rollback on failures.

## Scripts
```sh
npm run check   # typecheck
npm run test    # unit tests
npm run docs    # generate API docs into docs/api
npm run build   # build ESM + types into dist
```

Links
- Issues: https://github.com/orkestrel/core/issues

Orkestrel Core - Minimal, strongly-typed adapter/port toolkit for TypeScript.

This package provides a lightweight dependency injection container, lifecycle management,
and orchestration primitives for building composable applications with ports and adapters.

## Classes

- [Adapter](classes/Adapter.md)
- [Container](classes/Container.md)
- [DiagnosticAdapter](classes/DiagnosticAdapter.md)
- [EmitterAdapter](classes/EmitterAdapter.md)
- [EventAdapter](classes/EventAdapter.md)
- [LayerAdapter](classes/LayerAdapter.md)
- [Lifecycle](classes/Lifecycle.md)
- [LoggerAdapter](classes/LoggerAdapter.md)
- [NoopLogger](classes/NoopLogger.md)
- [Orchestrator](classes/Orchestrator.md)
- [QueueAdapter](classes/QueueAdapter.md)
- [RegistryAdapter](classes/RegistryAdapter.md)

## Interfaces

- [ContainerOptions](interfaces/ContainerOptions.md)
- [DiagnosticAdapterOptions](interfaces/DiagnosticAdapterOptions.md)
- [DiagnosticErrorContext](interfaces/DiagnosticErrorContext.md)
- [DiagnosticMessage](interfaces/DiagnosticMessage.md)
- [DiagnosticPort](interfaces/DiagnosticPort.md)
- [EmitterAdapterOptions](interfaces/EmitterAdapterOptions.md)
- [EmitterPort](interfaces/EmitterPort.md)
- [EventAdapterOptions](interfaces/EventAdapterOptions.md)
- [EventPort](interfaces/EventPort.md)
- [LayerAdapterOptions](interfaces/LayerAdapterOptions.md)
- [LayerNode](interfaces/LayerNode.md)
- [LayerPort](interfaces/LayerPort.md)
- [LifecycleErrorDetail](interfaces/LifecycleErrorDetail.md)
- [LifecycleOptions](interfaces/LifecycleOptions.md)
- [LoggerPort](interfaces/LoggerPort.md)
- [NodeEntry](interfaces/NodeEntry.md)
- [OrchestratorOptions](interfaces/OrchestratorOptions.md)
- [OrchestratorRegistration](interfaces/OrchestratorRegistration.md)
- [QueueAdapterOptions](interfaces/QueueAdapterOptions.md)
- [QueuePort](interfaces/QueuePort.md)
- [QueueRunOptions](interfaces/QueueRunOptions.md)
- [RegisterOptions](interfaces/RegisterOptions.md)
- [Registration](interfaces/Registration.md)
- [RegistryAdapterOptions](interfaces/RegistryAdapterOptions.md)
- [RegistryPort](interfaces/RegistryPort.md)
- [ResolvedProvider](interfaces/ResolvedProvider.md)
- [ValueProvider](interfaces/ValueProvider.md)

## Type Aliases

- [AggregateLifecycleError](type-aliases/AggregateLifecycleError.md)
- [ClassProvider](type-aliases/ClassProvider.md)
- [ClassProviderNoDeps](type-aliases/ClassProviderNoDeps.md)
- [ClassProviderWithContainer](type-aliases/ClassProviderWithContainer.md)
- [ClassProviderWithObject](type-aliases/ClassProviderWithObject.md)
- [ClassProviderWithTuple](type-aliases/ClassProviderWithTuple.md)
- [ContainerGetter](type-aliases/ContainerGetter.md)
- [CtorNoDeps](type-aliases/CtorNoDeps.md)
- [CtorWithContainer](type-aliases/CtorWithContainer.md)
- [DestroyJobResult](type-aliases/DestroyJobResult.md)
- [DiagnosticScope](type-aliases/DiagnosticScope.md)
- [EmitterListener](type-aliases/EmitterListener.md)
- [EventHandler](type-aliases/EventHandler.md)
- [EventMap](type-aliases/EventMap.md)
- [FactoryProvider](type-aliases/FactoryProvider.md)
- [FactoryProviderNoDeps](type-aliases/FactoryProviderNoDeps.md)
- [FactoryProviderWithContainer](type-aliases/FactoryProviderWithContainer.md)
- [FactoryProviderWithObject](type-aliases/FactoryProviderWithObject.md)
- [FactoryProviderWithTuple](type-aliases/FactoryProviderWithTuple.md)
- [FromSchema](type-aliases/FromSchema.md)
- [Guard](type-aliases/Guard.md)
- [InjectObject](type-aliases/InjectObject.md)
- [InjectTuple](type-aliases/InjectTuple.md)
- [LifecycleContext](type-aliases/LifecycleContext.md)
- [LifecycleEventMap](type-aliases/LifecycleEventMap.md)
- [LifecycleHook](type-aliases/LifecycleHook.md)
- [LifecyclePhase](type-aliases/LifecyclePhase.md)
- [LifecycleState](type-aliases/LifecycleState.md)
- [LogLevel](type-aliases/LogLevel.md)
- [MessageMapEntry](type-aliases/MessageMapEntry.md)
- [OptionalResolvedMap](type-aliases/OptionalResolvedMap.md)
- [OrchestratorGetter](type-aliases/OrchestratorGetter.md)
- [OrchestratorStartResult](type-aliases/OrchestratorStartResult.md)
- [Outcome](type-aliases/Outcome.md)
- [PhaseResult](type-aliases/PhaseResult.md)
- [PhaseResultErr](type-aliases/PhaseResultErr.md)
- [PhaseResultOk](type-aliases/PhaseResultOk.md)
- [PhaseTimeouts](type-aliases/PhaseTimeouts.md)
- [PrimitiveTag](type-aliases/PrimitiveTag.md)
- [Provider](type-aliases/Provider.md)
- [ProviderMatchHandlers](type-aliases/ProviderMatchHandlers.md)
- [ProviderMatchReturnHandlers](type-aliases/ProviderMatchReturnHandlers.md)
- [ResolvedMap](type-aliases/ResolvedMap.md)
- [ResolveRule](type-aliases/ResolveRule.md)
- [SchemaSpec](type-aliases/SchemaSpec.md)
- [Task](type-aliases/Task.md)
- [Token](type-aliases/Token.md)
- [TokenRecord](type-aliases/TokenRecord.md)
- [TokensOf](type-aliases/TokensOf.md)

## Variables

- [container](variables/container.md)
- [CONTAINER\_MESSAGES](variables/CONTAINER_MESSAGES.md)
- [HELP](variables/HELP.md)
- [INTERNAL\_MESSAGES](variables/INTERNAL_MESSAGES.md)
- [LIFECYCLE\_MESSAGES](variables/LIFECYCLE_MESSAGES.md)
- [orchestrator](variables/orchestrator.md)
- [ORCHESTRATOR\_MESSAGES](variables/ORCHESTRATOR_MESSAGES.md)
- [PORTS\_MESSAGES](variables/PORTS_MESSAGES.md)
- [QUEUE\_MESSAGES](variables/QUEUE_MESSAGES.md)
- [REGISTRY\_MESSAGES](variables/REGISTRY_MESSAGES.md)

## Functions

- [arrayOf](functions/arrayOf.md)
- [createPortToken](functions/createPortToken.md)
- [createPortTokens](functions/createPortTokens.md)
- [createToken](functions/createToken.md)
- [createTokens](functions/createTokens.md)
- [extendPorts](functions/extendPorts.md)
- [getTag](functions/getTag.md)
- [hasOwn](functions/hasOwn.md)
- [hasSchema](functions/hasSchema.md)
- [isAggregateLifecycleError](functions/isAggregateLifecycleError.md)
- [isAsyncFunction](functions/isAsyncFunction.md)
- [isBoolean](functions/isBoolean.md)
- [isClassProvider](functions/isClassProvider.md)
- [isClassProviderNoDeps](functions/isClassProviderNoDeps.md)
- [isClassProviderWithContainer](functions/isClassProviderWithContainer.md)
- [isClassProviderWithObject](functions/isClassProviderWithObject.md)
- [isClassProviderWithTuple](functions/isClassProviderWithTuple.md)
- [isFactoryProvider](functions/isFactoryProvider.md)
- [isFactoryProviderNoDeps](functions/isFactoryProviderNoDeps.md)
- [isFactoryProviderWithContainer](functions/isFactoryProviderWithContainer.md)
- [isFactoryProviderWithObject](functions/isFactoryProviderWithObject.md)
- [isFactoryProviderWithTuple](functions/isFactoryProviderWithTuple.md)
- [isFiniteNumber](functions/isFiniteNumber.md)
- [isLifecycleErrorDetail](functions/isLifecycleErrorDetail.md)
- [isObject](functions/isObject.md)
- [isPromiseLike](functions/isPromiseLike.md)
- [isProviderObject](functions/isProviderObject.md)
- [isRawProviderValue](functions/isRawProviderValue.md)
- [isString](functions/isString.md)
- [isToken](functions/isToken.md)
- [isTokenArray](functions/isTokenArray.md)
- [isTokenRecord](functions/isTokenRecord.md)
- [isValueProvider](functions/isValueProvider.md)
- [isZeroArg](functions/isZeroArg.md)
- [literalOf](functions/literalOf.md)
- [matchProvider](functions/matchProvider.md)
- [register](functions/register.md)
- [safeInvoke](functions/safeInvoke.md)
- [tokenDescription](functions/tokenDescription.md)
