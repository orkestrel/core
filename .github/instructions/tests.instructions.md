---
applyTo: "tests/**/*.test.ts"
---

Purpose
- Provide fast, deterministic unit tests that validate correctness of library code
- Mirror `src/` structure exactly - one test file per source module
- Use Vitest as test runner with runtime-neutral test code where possible
- Catch regressions early with comprehensive coverage of happy paths and edge cases

When to create/use
- **One test file per source module** - `tests/foo.test.ts` for every `src/foo.ts`
- Create test immediately when adding new source file
- Update test when modifying existing source file
- Add tests before fixing bugs (TDD approach)

Required file structure
- **Mirror src structure** - `src/user.ts` → `tests/user.test.ts`
- **Use `.test.ts` suffix** - recognized by Vitest
- **One top-level `describe()` per file** - named after the module
- **Nested `describe()` per function/feature** - clear test organization
- **Descriptive test names** - explain what is being tested and expected outcome

Rules and structure

### File organization
```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { functionA, functionB } from '../src/module.js'

describe('module', () => {
  describe('functionA', () => {
    it('handles typical input correctly', () => {
      expect(functionA('input')).toBe('expected')
    })

    it('throws TypeError for invalid input', () => {
      expect(() => functionA(null)).toThrow(TypeError)
    })
  })

  describe('functionB', () => {
    it('returns empty array for empty input', () => {
      expect(functionB([])).toEqual([])
    })
  })
})
```

### Test naming conventions
- Use **descriptive sentences** that explain behavior
- Start with verb: "returns", "throws", "handles", "validates", "transforms"
- Be specific: "returns empty array for empty input" not "works with empty input"
- Include edge cases: "handles null input", "works with maximum value"

```ts
// GOOD - descriptive, specific
it('returns formatted file size with correct units', () => {})
it('throws TypeError when input is null', () => {})
it('handles empty array without errors', () => {})
it('preserves readonly property on input object', () => {})

// BAD - vague, unclear
it('works', () => {})
it('test 1', () => {})
it('should do stuff', () => {})
```

Runtime guidance
- **Tests should exercise the public API in a runtime-neutral way**
- **Avoid Node-only globals/APIs** unless the subject under test requires them
- **For CLI tests**, it's acceptable to use Node built-ins and spawn processes
- **For server tests**, Node APIs are acceptable (http, net, etc.)
- **For helpers/types/core logic**, keep tests platform-agnostic

```ts
// GOOD - runtime-neutral helper test
describe('formatFileSize', () => {
  it('formats bytes correctly', () => {
    expect(formatFileSize(1024)).toBe('1.00 KB')
  })
})

// ACCEPTABLE - CLI-specific test using Node APIs
describe('cli', () => {
  it('parses command line arguments', async () => {
    const { execSync } = await import('node:child_process')
    const output = execSync('node dist/cli.js --help', { encoding: 'utf-8' })
    expect(output).toContain('Usage:')
  })
})
```

Imports
- **Prefer the package/scoped alias** (e.g., `@orkestrel/package`) for public API if configured
- **Otherwise use relative imports** with `.js` suffix
- **Import from source**, not built code (unless testing build output)
- **Use `import type`** for types to avoid runtime imports

```ts
// GOOD - relative import from source
import { createUser } from '../src/user.js'
import type { User } from '../src/types.js'

// GOOD - package alias if configured
import { createUser } from '@my-org/my-library'

// BAD - importing from dist
import { createUser } from '../dist/user.js'
```

Test runner: Vitest
- **Use Vitest assertions** - `expect()`, matchers, etc.
- **Prefer real small scenarios** over heavy mocks - test actual behavior
- **Mock sparingly** - only for external dependencies (network, file system)
- **Use `vi.fn()` for spies** and mock functions
- **Use `vi.mock()` for module mocking** when needed

Coverage expectations
- **Cover happy path** - typical usage scenarios that should work
- **Cover key edge cases** - empty inputs, nulls, boundary values, errors
- **Cover error handling** - invalid inputs, exceptions, timeouts
- **Keep tests fast** - avoid long timeouts, sleep, or real I/O
- **Keep tests isolated** - each test should be independent

```ts
describe('parseNumber', () => {
  // Happy path
  it('parses valid integer string', () => {
    expect(parseNumber('42')).toBe(42)
  })

  it('parses negative numbers', () => {
    expect(parseNumber('-10')).toBe(-10)
  })

  // Edge cases
  it('returns 0 for zero string', () => {
    expect(parseNumber('0')).toBe(0)
  })

  it('handles decimal strings', () => {
    expect(parseNumber('3.14')).toBe(3.14)
  })

  // Error cases
  it('throws for non-numeric string', () => {
    expect(() => parseNumber('abc')).toThrow(TypeError)
  })

  it('throws for null input', () => {
    expect(() => parseNumber(null as any)).toThrow(TypeError)
  })
})
```

Deterministic timing
- **Avoid real timers** - use `vi.useFakeTimers()` instead
- **Short test timeouts** - tests should complete in milliseconds
- **No `setTimeout` without fake timers** - causes flaky tests
- **No network requests** - mock or use test fixtures

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('delays function execution', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100)

    debounced()
    expect(fn).not.toHaveBeenCalled()

    vi.advanceTimersByTime(100)
    expect(fn).toHaveBeenCalledOnce()
  })
})
```

Mocking patterns

### Mocking functions
```ts
it('calls callback with result', () => {
  const callback = vi.fn()
  processData('input', callback)
  expect(callback).toHaveBeenCalledWith('processed: input')
})
```

### Mocking modules
```ts
vi.mock('../src/api.js', () => ({
  fetchData: vi.fn(() => Promise.resolve({ data: 'mocked' }))
}))

it('uses mocked API', async () => {
  const result = await getData()
  expect(result).toEqual({ data: 'mocked' })
})
```

### Spying on console (for logging tests)
```ts
it('logs error message', () => {
  const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  
  handleError(new Error('test'))
  
  expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('test'))
  consoleSpy.mockRestore()
})
```

Assertion patterns

### Basic assertions
```ts
expect(value).toBe(expected)              // strict equality
expect(value).toEqual(expected)           // deep equality
expect(value).toBeTruthy()                // truthy check
expect(value).toBeFalsy()                 // falsy check
expect(value).toBeUndefined()             // undefined check
expect(value).toBeNull()                  // null check
```

### Array/Object assertions
```ts
expect(array).toHaveLength(3)
expect(array).toContain('item')
expect(array).toEqual(expect.arrayContaining([1, 2]))
expect(obj).toHaveProperty('key', 'value')
expect(obj).toMatchObject({ subset: 'of properties' })
```

### Type assertions
```ts
expect(typeof value).toBe('string')
expect(value).toBeInstanceOf(Error)
expect(Array.isArray(value)).toBe(true)
```

### Error assertions
```ts
expect(() => dangerousFunction()).toThrow()
expect(() => dangerousFunction()).toThrow(TypeError)
expect(() => dangerousFunction()).toThrow('Expected error message')
expect(async () => await asyncFunction()).rejects.toThrow()
```

### Promise assertions
```ts
await expect(promise).resolves.toBe(value)
await expect(promise).rejects.toThrow(Error)
```

### Mock assertions
```ts
expect(mockFn).toHaveBeenCalled()
expect(mockFn).toHaveBeenCalledTimes(2)
expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2')
expect(mockFn).toHaveBeenLastCalledWith('arg')
```

Testing helpers in src/helpers.ts
- **Maintain coverage in `tests/helpers.test.ts`**
- **Test each helper function** in its own describe block
- **Test purity** - verify inputs are not mutated

```ts
// tests/helpers.test.ts
import { describe, it, expect } from 'vitest'
import { unique, formatFileSize, truncate } from '../src/helpers.js'

describe('helpers', () => {
  describe('unique', () => {
    it('removes duplicates', () => {
      expect(unique([1, 2, 2, 3, 3, 3])).toEqual([1, 2, 3])
    })

    it('handles empty array', () => {
      expect(unique([])).toEqual([])
    })

    it('does not mutate input', () => {
      const input = [1, 2, 2]
      unique(input)
      expect(input).toEqual([1, 2, 2]) // unchanged
    })
  })

  describe('formatFileSize', () => {
    it('formats bytes', () => {
      expect(formatFileSize(1024)).toBe('1.00 KB')
    })

    it('handles zero', () => {
      expect(formatFileSize(0)).toBe('0 B')
    })
  })
})
```

Testing type guards
```ts
import { describe, it, expect } from 'vitest'
import { isServerCommand } from '../src/commands.js'
import type { ServerCommand } from '../src/types.js'

describe('isServerCommand', () => {
  it('returns true for valid command', () => {
    const cmd: unknown = {
      id: 'test',
      label: 'Test',
      action: () => {}
    }
    expect(isServerCommand(cmd)).toBe(true)
    if (isServerCommand(cmd)) {
      // Type narrowing works
      expect(cmd.id).toBe('test')
    }
  })

  it('returns false for missing id', () => {
    expect(isServerCommand({ label: 'Test', action: () => {} })).toBe(false)
  })

  it('returns false for null', () => {
    expect(isServerCommand(null)).toBe(false)
  })
})
```

Setup and teardown
- **Use `beforeEach`** for test-specific setup
- **Use `afterEach`** for cleanup (mocks, timers, spies)
- **Use `beforeAll`** sparingly - for expensive one-time setup
- **Always clean up** - restore mocks, clear timers, close connections

```ts
describe('module', () => {
  let resource: Resource

  beforeEach(() => {
    resource = createResource()
    vi.useFakeTimers()
  })

  afterEach(() => {
    resource.cleanup()
    vi.restoreAllMocks()
  })

  it('uses resource', () => {
    expect(resource.getData()).toBeDefined()
  })
})
```

Async testing
- **Use async/await** for promises
- **Don't forget await** - common mistake
- **Test both success and error paths**

```ts
describe('async function', () => {
  it('resolves with data', async () => {
    const result = await fetchData()
    expect(result).toHaveProperty('data')
  })

  it('rejects on error', async () => {
    await expect(fetchData({ invalid: true })).rejects.toThrow('Invalid')
  })
})
```

Testing classes
```ts
describe('User', () => {
  let user: User

  beforeEach(() => {
    user = new User('John', 'john@example.com')
  })

  describe('constructor', () => {
    it('sets name and email', () => {
      expect(user.getName()).toBe('John')
      expect(user.getEmail()).toBe('john@example.com')
    })
  })

  describe('updateEmail', () => {
    it('updates email successfully', () => {
      user.updateEmail('new@example.com')
      expect(user.getEmail()).toBe('new@example.com')
    })

    it('throws for invalid email', () => {
      expect(() => user.updateEmail('invalid')).toThrow(TypeError)
    })
  })
})
```

Performance testing (when needed)
```ts
import { describe, it, expect } from 'vitest'

describe('largeArraySort', () => {
  it('completes within reasonable time', () => {
    const largeArray = Array.from({ length: 100_000 }, (_, i) => i)
    const start = Date.now()
    
    sortArray(largeArray)
    
    const duration = Date.now() - start
    expect(duration).toBeLessThan(1000) // Should complete in < 1 second
  })
})
```

Anti-patterns to avoid

### ❌ Testing implementation details
```ts
// BAD - tests private internals
it('calls internal helper', () => {
  const spy = vi.spyOn(module, '_internalHelper')
  module.publicFunction()
  expect(spy).toHaveBeenCalled()
})

// GOOD - tests public behavior
it('returns expected result', () => {
  expect(module.publicFunction()).toBe('expected')
})
```

### ❌ Flaky tests with real timers
```ts
// BAD - flaky
it('delays execution', (done) => {
  setTimeout(() => {
    expect(result).toBe('done')
    done()
  }, 100) // Real timer - might fail on slow CI
})

// GOOD - deterministic
it('delays execution', () => {
  vi.useFakeTimers()
  const callback = vi.fn()
  setTimeout(callback, 100)
  vi.advanceTimersByTime(100)
  expect(callback).toHaveBeenCalled()
})
```

### ❌ Tests that depend on each other
```ts
// BAD - tests share state
let sharedState: number

it('sets state', () => {
  sharedState = 42
})

it('uses state from previous test', () => {
  expect(sharedState).toBe(42) // Fragile!
})

// GOOD - each test is independent
it('sets and uses state', () => {
  const state = 42
  expect(state).toBe(42)
})
```

### ❌ Overly complex test setup
```ts
// BAD - hard to understand
beforeEach(() => {
  // 50 lines of setup
})

// GOOD - helper functions for clarity
function createTestUser(overrides = {}) {
  return { name: 'Test', email: 'test@example.com', ...overrides }
}

it('validates user', () => {
  const user = createTestUser({ email: 'invalid' })
  expect(validate(user)).toBe(false)
})
```

Code coverage
- **Aim for high coverage** but focus on meaningful tests
- **100% coverage ≠ perfect tests** - quality over quantity
- **Cover all error paths** - not just happy path
- **Use coverage reports** to find untested code

```bash
# Run tests with coverage
npm test -- --coverage
```

Test placeholders and pending tests

**CRITICAL: Never skip tests or create placeholder tests that pass**

When templating or scaffolding test files for logic that hasn't been implemented yet:
- **Use `it.todo()` or `test.todo()`** - Vitest's built-in method for marking pending tests
- **Describe WHAT needs to be tested** - be specific about the test case
- **Never write `it.skip()` or empty tests** that pass without assertions
- **Never write placeholder tests** with `expect(true).toBe(true)` or similar

### ❌ BAD - Placeholder that passes
```ts
describe('calculateTotal', () => {
  it('calculates total correctly', () => {
    // TODO: implement this test
    expect(true).toBe(true)
  })
})
```

### ❌ BAD - Skipped test with no description
```ts
it.skip('test this later', () => {})
```

### ✅ GOOD - Using it.todo with clear description
```ts
describe('calculateTotal', () => {
  it.todo('calculates total for multiple items with different quantities')
  it.todo('applies discount when total exceeds threshold')
  it.todo('throws TypeError when items array is empty')
  it.todo('handles decimal prices correctly without floating point errors')
})
```

### ✅ GOOD - Todo with implementation notes
```ts
describe('UserService', () => {
  describe('createUser', () => {
    it.todo('validates email format before creating user')
    it.todo('generates unique ID for new user')
    it.todo('throws TypeError if name is missing')
    it.todo('sets default role to "user" when not specified')
    
    // When implementing these, each todo becomes a real test:
    // it('validates email format before creating user', () => {
    //   expect(() => createUser({ name: 'John', email: 'invalid' }))
    //     .toThrow(TypeError)
    // })
  })
})
```

Why this matters:
- **`it.todo()` shows up in test output** as pending, reminding developers to implement
- **Test runner fails if todos remain** in some CI configurations (configurable)
- **Documents expected behavior** before implementation exists
- **Prevents false sense of completeness** - tests don't artificially pass
- **Makes it obvious** when tests are missing for implemented features

Checking for missing tests when implementing logic:
1. **Before implementing a feature**, add `it.todo()` tests describing all expected behavior
2. **After implementing logic**, convert todos to real tests one by one
3. **Run `npm test`** - todos will show in output as "Todo" status
4. **Never commit implemented features** with remaining todos for that feature
5. **Search codebase** for `it.todo` or `test.todo` regularly to ensure coverage

Example workflow:
```ts
// Step 1: Template function with todos
describe('parseJson', () => {
  it.todo('parses valid JSON string to object')
  it.todo('throws TypeError for invalid JSON')
  it.todo('throws TypeError when input is not a string')
  it.todo('handles nested objects correctly')
})

// Step 2: Implement function in src/parser.ts
export function parseJson(input: string): unknown {
  if (typeof input !== 'string') {
    throw new TypeError('Input must be a string')
  }
  try {
    return JSON.parse(input)
  } catch {
    throw new TypeError('Invalid JSON')
  }
}

// Step 3: Convert todos to real tests
describe('parseJson', () => {
  it('parses valid JSON string to object', () => {
    const result = parseJson('{"key": "value"}')
    expect(result).toEqual({ key: 'value' })
  })

  it('throws TypeError for invalid JSON', () => {
    expect(() => parseJson('invalid')).toThrow(TypeError)
  })

  it('throws TypeError when input is not a string', () => {
    expect(() => parseJson(null as any)).toThrow(TypeError)
  })

  it('handles nested objects correctly', () => {
    const result = parseJson('{"nested": {"key": "value"}}')
    expect(result).toEqual({ nested: { key: 'value' } })
  })
})
```

Agent responsibilities:
- **When scaffolding tests for new features**, always use `it.todo()` with descriptive test names
- **When implementing logic**, check for related `it.todo()` tests and implement them
- **Before marking a feature complete**, ensure no `it.todo()` remains for that feature
- **When reviewing code**, search for `it.todo` in related test files and flag if missing tests
- **Never create passing placeholder tests** - use `it.todo()` instead

Checklist
- [ ] Test file mirrors source file structure (`src/foo.ts` → `tests/foo.test.ts`)
- [ ] One top-level `describe()` per file
- [ ] Nested `describe()` for each function/feature
- [ ] Descriptive test names explaining expected behavior
- [ ] Imports use relative paths with `.js` suffix (or package alias)
- [ ] Tests are deterministic (no real timers, no random values)
- [ ] Fast execution (< 100ms per test ideal)
- [ ] Isolated tests (no shared state between tests)
- [ ] Happy path covered
- [ ] Edge cases covered (empty, null, boundary values)
- [ ] Error cases covered (invalid input, exceptions)
- [ ] Async functions use async/await correctly
- [ ] Mocks are restored in afterEach
- [ ] Timers are fake and advanced explicitly
- [ ] No console.log in tests (use expect for validation)
- [ ] **No placeholder tests that pass** - use `it.todo()` instead
- [ ] **No `it.skip()` without clear reason** and plan to unskip
- [ ] **All `it.todo()` converted to real tests** when logic is implemented
- [ ] Tests pass consistently: `npm test`
- [ ] Type check passes: `npm run check`
- [ ] No Node-only APIs in core library tests (unless testing CLI/server)
- [ ] Coverage is adequate for critical paths
