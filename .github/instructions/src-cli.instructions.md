---
applyTo: "src/cli.ts"
---

Purpose
- Thin CLI entrypoint that provides command-line interface to library functionality
- Server/Node-only code that may use Node built-ins (unlike shared library modules)
- Delegates to library functions rather than implementing business logic
- Handles argument parsing, user interaction, and process lifecycle

When to create/use
- **Only when a command-line interface is needed** for the library
- CLI is server-only and may use Node built-ins
- Keep the rest of the library environment-agnostic (browser + server compatible)

When NOT to create
- If library is browser-only or doesn't need CLI
- If business logic should live in library modules instead

Required structure/exports
- **Parse args** using Node's built-in `util.parseArgs` or similar
- **Call exported library functions** from public API modules
- **Set explicit exit codes** - 0 for success, non-zero for errors
- **Keep parse/format isolated** from business logic
- **No exports needed** - this is an entrypoint, not a module (unless testing)

File structure
```ts
#!/usr/bin/env node
import { parseArgs } from 'node:util'
import { someFunction } from './index.js'

// 1. Parse arguments
// 2. Validate input
// 3. Call library functions
// 4. Handle errors
// 5. Exit with appropriate code
```

Allowed imports and ESM rules
- **Import from public API modules** - prefer importing from `./index.js` (barrel)
- **Avoid importing internal, non-public code** directly
- **Relative imports include `.js`** when used
- **Node-only APIs are allowed here** (this is the ONLY place they should be used)
  - ✅ Can use: `node:util`, `node:fs`, `node:path`, `node:process`, `node:readline`
  - ✅ Can use: `process.exit()`, `console.log()`, `process.argv`

Patterns to prefer

### 1. Using util.parseArgs for argument parsing
```ts
#!/usr/bin/env node
import { parseArgs } from 'node:util'
import { buildProject } from './index.js'

const { values, positionals } = parseArgs({
  options: {
    help: {
      type: 'boolean',
      short: 'h',
      default: false
    },
    output: {
      type: 'string',
      short: 'o',
      default: 'dist'
    },
    minify: {
      type: 'boolean',
      default: true
    },
    verbose: {
      type: 'boolean',
      short: 'v',
      default: false
    }
  },
  allowPositionals: true
})

if (values.help) {
  console.log(`
Usage: my-cli [options] [input]

Options:
  -h, --help        Show this help message
  -o, --output DIR  Output directory (default: dist)
  --minify          Enable minification (default: true)
  -v, --verbose     Enable verbose logging

Examples:
  my-cli src/index.ts
  my-cli --output build --no-minify src/index.ts
  `)
  process.exit(0)
}

try {
  const inputFile = positionals[0]
  if (!inputFile) {
    console.error('Error: Input file required')
    process.exit(1)
  }

  await buildProject({
    input: inputFile,
    output: values.output,
    minify: values.minify,
    verbose: values.verbose
  })

  console.log('✓ Build complete')
  process.exit(0)
} catch (error) {
  console.error('Error:', error instanceof Error ? error.message : 'Unknown error')
  if (values.verbose && error instanceof Error) {
    console.error(error.stack)
  }
  process.exit(1)
}
```

### 2. Interactive prompts with readline
```ts
#!/usr/bin/env node
import * as readline from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'
import { createProject } from './index.js'

const rl = readline.createInterface({ input, output })

try {
  const name = await rl.question('Project name: ')
  const description = await rl.question('Description: ')
  
  if (!name) {
    console.error('Error: Project name is required')
    process.exit(1)
  }

  await createProject({ name, description })
  console.log(`✓ Created project: ${name}`)
  process.exit(0)
} catch (error) {
  console.error('Error:', error instanceof Error ? error.message : 'Unknown error')
  process.exit(1)
} finally {
  rl.close()
}
```

### 3. Subcommand pattern
```ts
#!/usr/bin/env node
import { parseArgs } from 'node:util'
import { build, test, deploy } from './index.js'

const { values, positionals } = parseArgs({
  options: {
    help: { type: 'boolean', short: 'h' }
  },
  allowPositionals: true
})

const command = positionals[0]

if (!command || values.help) {
  console.log(`
Usage: my-cli <command> [options]

Commands:
  build     Build the project
  test      Run tests
  deploy    Deploy to production

Options:
  -h, --help  Show help for command
  `)
  process.exit(values.help ? 0 : 1)
}

try {
  switch (command) {
    case 'build':
      await build()
      break
    case 'test':
      await test()
      break
    case 'deploy':
      await deploy()
      break
    default:
      console.error(`Unknown command: ${command}`)
      process.exit(1)
  }
  process.exit(0)
} catch (error) {
  console.error('Error:', error instanceof Error ? error.message : 'Unknown error')
  process.exit(1)
}
```

### 4. Progress reporting for long operations
```ts
#!/usr/bin/env node
import { processFiles } from './index.js'

const files = process.argv.slice(2)

if (files.length === 0) {
  console.error('Error: No files specified')
  process.exit(1)
}

console.log(`Processing ${files.length} files...`)

try {
  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    process.stdout.write(`[${i + 1}/${files.length}] ${file}... `)
    
    await processFiles([file])
    
    console.log('✓')
  }
  
  console.log('\n✓ All files processed')
  process.exit(0)
} catch (error) {
  console.error('\n✗ Error:', error instanceof Error ? error.message : 'Unknown error')
  process.exit(1)
}
```

Anti-patterns to avoid

### ❌ Embedding business logic in CLI
```ts
// BAD - business logic in CLI file
async function processData(input: string): Promise<string> {
  // 100 lines of processing logic
  return processed
}

// CLI calls processData directly
const result = await processData(input)

// GOOD - delegate to library
import { processData } from './index.js'

const result = await processData(input)
```

### ❌ Pulling Node-only code into environment-agnostic modules
```ts
// BAD - makes library module Node-only
// src/processor.ts
import { readFileSync } from 'node:fs'

export function process(): void {
  readFileSync('file.txt')
}

// GOOD - keep Node code in CLI only
// src/cli.ts
import { readFileSync } from 'node:fs'
import { process } from './index.js'

const content = readFileSync('file.txt', 'utf-8')
await process(content)
```

### ❌ No error handling
```ts
// BAD - crashes with stack trace
const result = await someOperation() // Might throw

// GOOD - catches and formats errors
try {
  const result = await someOperation()
} catch (error) {
  console.error('Error:', error instanceof Error ? error.message : 'Unknown error')
  process.exit(1)
}
```

### ❌ Missing help output
```ts
// BAD - no guidance for users
const file = process.argv[2]
await process(file)

// GOOD - provide helpful --help
if (values.help || !file) {
  console.log(`
Usage: my-cli [options] <file>

Options:
  -h, --help  Show this help message

Examples:
  my-cli input.txt
  `)
  process.exit(0)
}
```

Exit codes
- **0** - Success
- **1** - General error (invalid input, operation failed)
- **2** - Misuse of shell command (invalid arguments)
- **126** - Command cannot execute
- **127** - Command not found
- **128+n** - Fatal error signal "n"

```ts
// Use appropriate exit codes
if (!inputValid) {
  console.error('Error: Invalid input')
  process.exit(2) // Misuse of command
}

try {
  await operation()
  process.exit(0) // Success
} catch (error) {
  console.error('Error:', error)
  process.exit(1) // General error
}
```

Windows-friendly examples
- **Use PowerShell** in documentation examples
- **Show Windows paths** with backslashes in examples
- **Quote paths with spaces** correctly

```ts
// In --help output, show Windows-friendly examples
console.log(`
Examples (PowerShell):
  .\\my-cli.exe --output dist src\\index.ts
  .\\my-cli.exe --config "C:\\Users\\Name\\config.json"
`)
```

Environment variable handling
```ts
// Read env vars with defaults
const apiKey = process.env.API_KEY ?? 'default-key'
const port = parseInt(process.env.PORT ?? '3000', 10)

// Validate env vars
if (!process.env.REQUIRED_VAR) {
  console.error('Error: REQUIRED_VAR environment variable must be set')
  process.exit(1)
}
```

Helpful usage output
- **Show all commands/options** with descriptions
- **Include examples** demonstrating common use cases
- **Use clear formatting** with indentation and sections
- **Show defaults** for optional parameters

```ts
function showHelp(): void {
  console.log(`
my-cli v1.0.0

Usage: my-cli [options] <command> [arguments]

Commands:
  build <input>      Build project from input file
  test [pattern]     Run tests matching pattern (default: all)
  deploy [env]       Deploy to environment (default: production)

Options:
  -h, --help         Show this help message
  -v, --version      Show version number
  -c, --config FILE  Config file path (default: config.json)
  --verbose          Enable verbose logging
  --no-color         Disable colored output

Examples:
  # Build project
  my-cli build src\\index.ts

  # Run specific tests
  my-cli test user.*

  # Deploy to staging
  my-cli deploy staging --config staging-config.json

For more information, visit: https://example.com/docs
  `)
}
```

Testing CLI
- **Provide smoke tests** if a CLI exists
- **Test via child_process** spawning actual CLI
- **Prefer small example runs** over heavy mocks
- **Capture stdout/stderr** for assertions

```ts
// tests/cli.test.ts
import { describe, it, expect } from 'vitest'
import { execSync } from 'node:child_process'

describe('CLI', () => {
  it('shows help when --help is passed', () => {
    const output = execSync('node dist/cli.js --help', {
      encoding: 'utf-8'
    })
    
    expect(output).toContain('Usage:')
    expect(output).toContain('Options:')
  })

  it('exits with code 1 for invalid input', () => {
    expect(() => {
      execSync('node dist/cli.js invalid', {
        encoding: 'utf-8',
        stdio: 'pipe'
      })
    }).toThrow()
  })

  it('processes file successfully', () => {
    const output = execSync('node dist/cli.js test-input.txt', {
      encoding: 'utf-8'
    })
    
    expect(output).toContain('✓')
  })
})
```

Shebang for Unix systems
```ts
#!/usr/bin/env node
// ^^^ Allows CLI to be executed directly on Unix/Linux/macOS

// Rest of CLI code...
```

Package.json bin field
```json
{
  "name": "my-library",
  "version": "1.0.0",
  "type": "module",
  "bin": {
    "my-cli": "./dist/cli.js"
  }
}
```

Checklist
- [ ] File starts with `#!/usr/bin/env node` shebang
- [ ] Uses `util.parseArgs` or similar for argument parsing
- [ ] Provides `--help` option with clear usage instructions
- [ ] Includes examples in help output
- [ ] Windows-friendly examples (PowerShell, backslashes)
- [ ] Explicit exit codes (0 for success, non-zero for errors)
- [ ] Delegates to library functions from public API
- [ ] No business logic embedded in CLI file
- [ ] Proper error handling with try/catch
- [ ] User-friendly error messages (not raw stack traces)
- [ ] Verbose mode option for detailed errors
- [ ] Environment variables validated if required
- [ ] Progress output for long-running operations
- [ ] stdin/stdout/stderr used appropriately
- [ ] Node-only APIs isolated to this file only
- [ ] Package.json bin field configured
- [ ] Smoke tests exist in tests/cli.test.ts
- [ ] Works with `node dist/cli.js` after build
- [ ] File passes `npm run check` without errors
- [ ] Executable bit set if on Unix (chmod +x)
