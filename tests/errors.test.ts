import { test } from 'node:test'
import assert from 'node:assert/strict'
import { InvalidTransitionError, TimeoutError, AggregateLifecycleError, D, isLifecycleErrorDetail } from '@orkestrel/core'

test('InvalidTransitionError carries from/to and message', () => {
	const err = new InvalidTransitionError('started', 'created')
	assert.match(err.message, /Invalid lifecycle transition/)
	assert.equal(err.from, 'started')
	assert.equal(err.to, 'created')
})

test('TimeoutError formats hook and milliseconds', () => {
	const err = new TimeoutError('start', 123)
	assert.match(err.message, /timed out/)
	assert.equal(err.hook, 'start')
	assert.equal(err.ms, 123)
})

test('AggregateLifecycleError aggregates errors and exposes first cause', () => {
	const e1 = new Error('boom1')
	const e2 = new Error('boom2')
	const agg = new AggregateLifecycleError({ message: 'agg' }, [e1, e2])
	assert.equal(agg.message, 'agg')
	assert.equal(agg.errors.length, 2)
})

test('isLifecycleErrorDetail returns true for valid details', () => {
	const e1 = D.makeDetail({ description: 'A' }, 'start', 'normal', { durationMs: 5, error: new Error('x'), timedOut: false })
	const e2 = D.makeDetail({ description: 'B' }, 'stop', 'rollback', { durationMs: 1, error: new Error('y'), timedOut: true })
	assert.equal(isLifecycleErrorDetail(e1), true)
	assert.equal(isLifecycleErrorDetail(e2), true)
})

test('isLifecycleErrorDetail returns false for invalid shapes', () => {
	assert.equal(isLifecycleErrorDetail(null), false)
	assert.equal(isLifecycleErrorDetail({}), false)
	assert.equal(isLifecycleErrorDetail({ tokenDescription: 'x' }), false)
	assert.equal(isLifecycleErrorDetail({ tokenDescription: 'x', phase: 'start', context: 'normal', timedOut: false, durationMs: 'nope', error: new Error('z') }), false)
	assert.equal(isLifecycleErrorDetail({ tokenDescription: 'x', phase: 'start', context: 'normal', timedOut: false, durationMs: 1, error: 'err' }), false)
})
