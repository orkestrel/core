import { test } from 'node:test'
import assert from 'node:assert/strict'
import { extendPorts, createPortToken, createPortTokens, Orchestrator } from '@orkestrel/core'

interface EmailPort { send(to: string, subject: string, body: string): Promise<void> }
class InMemoryEmailAdapter implements EmailPort { async send() { /* no-op */ } }

interface FeatureFlagPort { isEnabled(flag: string): boolean }

test('createPortTokens creates a base token set and extendPorts merges new tokens', async () => {
	const Base = createPortTokens({ email: {} as EmailPort })
	const Extended = extendPorts(Base, { featureFlag: {} as FeatureFlagPort })
	assert.ok(Base.email)
	assert.ok(Extended.featureFlag)
	const orch = new Orchestrator()
	await orch.start([
		{ token: Base.email, provider: { useFactory: () => new InMemoryEmailAdapter() } },
	])
	const email = orch.getContainer().resolve(Base.email)
	assert.equal(typeof email.send, 'function')
	await orch.destroy()
})

test('extendPorts (single-arg) creates tokens from shape', () => {
	const Only = extendPorts({ email: {} as EmailPort }) as { email: ReturnType<typeof createPortToken<EmailPort>> }
	// Minimal shape checks
	assert.ok(Only.email)
	assert.equal(typeof Only.email.description, 'string')
	assert.equal(typeof Only.email, 'symbol')
})

test('extendPorts duplicate key throws', () => {
	const Base = createPortTokens({ email: {} as EmailPort })
	assert.throws(() => extendPorts(Base, { email: {} as EmailPort }), /duplicate port key/)
})

test('createPortToken produces unique token', () => {
	const T1 = createPortToken<EmailPort>('emailCustom')
	const T2 = createPortToken<EmailPort>('emailCustom')
	assert.notEqual(T1, T2)
})
