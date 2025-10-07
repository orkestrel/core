import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isLifecycleErrorDetail, DiagnosticAdapter } from '@orkestrel/core'
import type { LoggerPort, LogLevel, LifecycleErrorDetail } from '@orkestrel/core'

class FakeLogger implements LoggerPort {
	public entries: { level: LogLevel, message: string, fields?: Record<string, unknown> }[] = []
	log(level: LogLevel, message: string, fields?: Record<string, unknown>): void {
		this.entries.push({ level, message, fields })
	}
}

test('Diagnostics suite', async (t) => {
	await t.test('Timeout-like error via DiagnosticAdapter.help', () => {
		const d = new DiagnosticAdapter({ logger: new FakeLogger() })
		const err = d.help('ORK1021', { name: 'TimeoutError', message: 'Hook \'start\' timed out after 123ms' })
		assert.match(err.message, /timed out/i)
		assert.equal(err.name, 'TimeoutError')
	})

	await t.test('aggregate collects errors and surfaces .details/.errors', () => {
		const d = new DiagnosticAdapter({ logger: new FakeLogger() })
		const e1 = new Error('boom1')
		const e2 = new Error('boom2')
		try {
			d.aggregate('ORK1017', [e1, e2], { message: 'agg' })
			assert.fail('should throw')
		}
		catch (e) {
			const agg = e as Error & { details?: LifecycleErrorDetail[], errors?: Error[] }
			assert.equal(agg.message, 'agg')
			assert.ok(Array.isArray(agg.details))
			assert.equal(agg.details?.length, 2)
			assert.ok(Array.isArray(agg.errors))
			assert.equal(agg.errors?.length, 2)
		}
	})

	await t.test('isLifecycleErrorDetail returns true for valid details', () => {
		const e1: LifecycleErrorDetail = { tokenDescription: 'A', phase: 'start', context: 'normal', durationMs: 5, error: new Error('x'), timedOut: false }
		const e2: LifecycleErrorDetail = { tokenDescription: 'B', phase: 'stop', context: 'rollback', durationMs: 1, error: new Error('y'), timedOut: true }
		assert.equal(isLifecycleErrorDetail(e1), true)
		assert.equal(isLifecycleErrorDetail(e2), true)
	})

	await t.test('isLifecycleErrorDetail returns false for invalid shapes', () => {
		assert.equal(isLifecycleErrorDetail(null), false)
		assert.equal(isLifecycleErrorDetail({}), false)
		assert.equal(isLifecycleErrorDetail({ tokenDescription: 'x' }), false)
		assert.equal(isLifecycleErrorDetail({ tokenDescription: 'x', phase: 'start', context: 'normal', timedOut: false, durationMs: 'nope', error: new Error('z') }), false)
		assert.equal(isLifecycleErrorDetail({ tokenDescription: 'x', phase: 'start', context: 'normal', timedOut: false, durationMs: 1, error: 'err' }), false)
	})

	// DiagnosticAdapter tests (unified messages mapping)
	await t.test('DiagnosticAdapter default behavior without overrides', () => {
		const logger = new FakeLogger()
		const d = new DiagnosticAdapter({ logger })
		d.log('info', 'hello')
		assert.equal(logger.entries.length, 1)
		assert.equal(logger.entries[0].level, 'info')
		assert.equal(logger.entries[0].message, 'hello')
	})

	await t.test('DiagnosticAdapter overrides apply via messages array (log)', () => {
		const logger = new FakeLogger()
		const d = new DiagnosticAdapter({ logger, messages: [{ key: 'hello', level: 'warn', message: 'hi' }] })
		d.log('info', 'hello')
		assert.equal(logger.entries.length, 1)
		assert.equal(logger.entries[0].level, 'warn')
		assert.equal(logger.entries[0].message, 'hi')
	})

	await t.test('DiagnosticAdapter overrides apply for metric/trace/event', () => {
		const logger = new FakeLogger()
		const d = new DiagnosticAdapter({
			logger,
			messages: [
				{ key: 'm1', message: 'metric-one' },
				{ key: 't1', level: 'info' },
				{ key: 'e1', level: 'warn', message: 'event-one' },
			],
		})

		d.metric('m1', 42, { tag: 'x' })
		assert.equal(logger.entries[0].level, 'info') // default level for metric
		assert.equal(logger.entries[0].message, 'metric-one')
		assert.deepEqual(logger.entries[0].fields, { value: 42, tag: 'x' })

		logger.entries = []
		d.trace('t1', { a: 1 })
		assert.equal(logger.entries[0].level, 'info') // overridden level
		assert.equal(logger.entries[0].message, 't1') // message unchanged when not provided
		assert.deepEqual(logger.entries[0].fields, { a: 1 })

		logger.entries = []
		d.event('e1', { b: 2 })
		assert.equal(logger.entries[0].level, 'warn')
		assert.equal(logger.entries[0].message, 'event-one')
		assert.deepEqual(logger.entries[0].fields, { b: 2 })
	})

	await t.test('DiagnosticAdapter error uses context.code when provided', () => {
		const logger = new FakeLogger()
		const d = new DiagnosticAdapter({ logger, messages: [{ key: 'MYCODE', level: 'warn', message: 'bad things' }] })
		d.error(new Error('boom'), { code: 'MYCODE' as unknown as never })
		assert.equal(logger.entries[0].level, 'warn')
		assert.equal(logger.entries[0].message, 'bad things')
		assert.ok(logger.entries[0].fields && 'err' in (logger.entries[0].fields))
	})

	await t.test('DiagnosticAdapter error falls back to error name key when no code', () => {
		const logger = new FakeLogger()
		const d = new DiagnosticAdapter({ logger, messages: [{ key: 'Error', level: 'error', message: 'oops mapped' }] })
		d.error(new Error('original'))
		assert.equal(logger.entries[0].level, 'error')
		assert.equal(logger.entries[0].message, 'oops mapped')
	})
})
