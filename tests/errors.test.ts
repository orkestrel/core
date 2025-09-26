import { test } from 'node:test'
import assert from 'node:assert/strict'
import { InvalidTransitionError, TimeoutError, AggregateLifecycleError } from '@orkestrel/core'

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
	const agg = new AggregateLifecycleError('agg', [e1, e2])
	assert.equal(agg.message, 'agg')
	assert.equal(agg.errors.length, 2)
})
