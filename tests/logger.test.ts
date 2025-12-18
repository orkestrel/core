import { describe, test } from 'vitest';
import assert from 'node:assert/strict';
import { LoggerAdapter, NoopLogger } from '@orkestrel/core';

describe('Logger suite', () => {
	test('LoggerAdapter routes by level to console.*', () => {
		const calls: Array<{ name: string; payload: unknown[] }> = [];
		const orig = { debug: console.debug, info: console.info, warn: console.warn, error: console.error };
		console.debug = (...args: unknown[]) => {
			calls.push({ name: 'debug', payload: args });
		};
		console.info = (...args: unknown[]) => {
			calls.push({ name: 'info', payload: args });
		};
		console.warn = (...args: unknown[]) => {
			calls.push({ name: 'warn', payload: args });
		};
		console.error = (...args: unknown[]) => {
			calls.push({ name: 'error', payload: args });
		};
		try {
			const l = new LoggerAdapter();
			l.log('debug', 'a', { x: 1 });
			l.log('info', 'b', { y: 2 });
			l.log('warn', 'c', { z: 3 });
			l.log('error', 'd', { w: 4 });
			const names = calls.map(c => c.name);
			const msgs = calls.map(c => (c.payload[0] as { msg?: string }).msg);
			assert.deepStrictEqual({ names, msgs }, { names: ['debug', 'info', 'warn', 'error'], msgs: ['a', 'b', 'c', 'd'] });
		}
		finally {
			console.debug = orig.debug;
			console.info = orig.info;
			console.warn = orig.warn;
			console.error = orig.error;
		}
	});

	test('LoggerAdapter swallows console errors', () => {
		const orig = { error: console.error };
		let threw = false;
		console.error = () => {
			throw new Error('nope');
		};
		try {
			const l = new LoggerAdapter();
			l.log('error', 'e', { a: 1 });
			threw = false;
		}
		catch {
			threw = true;
		}
		finally {
			console.error = orig.error;
		}
		assert.equal(threw, false);
	});

	test('NoopLogger never throws', () => {
		const l = new NoopLogger();
		l.log('info', 'whatever', { a: 1 });
		assert.ok(true);
	});
});
