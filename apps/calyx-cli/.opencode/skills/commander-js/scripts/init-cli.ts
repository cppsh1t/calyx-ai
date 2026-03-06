#!/usr/bin/env bun
/**
 * CLI Project Initializer for Commander.js
 *
 * This script initializes a new CLI project with Commander.js.
 * It creates the basic project structure, installs dependencies,
 * and generates template files.
 *
 * Usage:
 *   bun run init-cli.ts [project-name]
 *
 * Features:
 * - Checks for existing package.json
 * - Creates project structure
 * - Installs commander dependency
 * - Generates src/index.ts template
 * - Adds dev scripts to package.json
 */

// @ts-ignore - Bun types
import { $ } from 'bun'

// Type declarations for Node globals
declare const process: {
  argv: string[]
  exit: (code?: number) => never
}

interface InitOptions {
  projectName?: string
  skipInstall?: boolean
  force?: boolean
}

/**
 * Default template for src/index.ts
 */
const INDEX_TS_TEMPLATE = `#!/usr/bin/env bun
import { Command } from 'commander';

const program = new Command();

program
  .name('<cli-name>')
  .description('A CLI tool built with Commander.js')
  .version('0.1.0');

// Example command
program.command('hello')
  .description('Say hello')
  .argument('[name]', 'Name to greet', 'World')
  .option('-c, --caps', 'Display in uppercase')
  .action((name: string, options: { caps?: boolean }) => {
    let message = "Hello, " + name + "!";
    if (options.caps) {
      message = message.toUpperCase();
    }
    console.log(message);
  });

program.parse();
`

/**
 * Default package.json template
 */
function getPackageJsonTemplate(name: string): Record<string, unknown> {
  return {
    name: name,
    version: '0.1.0',
    type: 'module',
    scripts: {
      dev: 'bun run src/index.ts',
      build: 'bun build src/index.ts --outdir ./dist --target bun',
      start: 'node dist/index.js',
    },
    dependencies: {
      commander: '^12.0.0',
    },
    devDependencies: {
      '@types/node': '^20.0.0',
      'bun-types': 'latest',
    },
  }
}

/**
 * Check if a file or directory exists
 */
async function exists(path: string): Promise<boolean> {
  try {
    await $`test -e ${path}`
    return true
  } catch {
    return false
  }
}

/**
 * Create directory structure
 */
async function createDirectories(projectName: string): Promise<void> {
  console.log('Creating directory structure for ' + projectName + '...')

  await $`mkdir -p ${projectName}/src`
  console.log('✓ Created src/')
}

/**
 * Generate src/index.ts
 */
async function generateIndex(projectName: string): Promise<void> {
  console.log('Generating src/index.ts...')

  const content = INDEX_TS_TEMPLATE.replace('<cli-name>', projectName)
  // @ts-ignore
  await Bun.write(`${projectName}/src/index.ts`, content)

  console.log('✓ Created src/index.ts')
}

/**
 * Create or update package.json
 */
async function createPackageJson(projectName: string, force: boolean): Promise<void> {
  const packagePath = `${projectName}/package.json`
  const hasPackageJson = await exists(packagePath)

  if (hasPackageJson && !force) {
    console.log('package.json already exists. Use --force to overwrite.')
    return
  }

  console.log('Creating package.json...')

  const pkgJson = getPackageJsonTemplate(projectName)
  // @ts-ignore
  await Bun.write(packagePath, JSON.stringify(pkgJson, null, 2))

  console.log('✓ Created package.json')
}

/**
 * Create tsconfig.json for TypeScript support
 */
async function createTsConfig(projectName: string): Promise<void> {
  console.log('Creating tsconfig.json...')

  const tsconfig = {
    compilerOptions: {
      target: 'ESNext',
      module: 'ESNext',
      moduleResolution: 'bundler',
      types: ['bun-types'],
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      forceConsistentCasingInFileNames: true,
    },
    include: ['src/**/*'],
    exclude: ['node_modules'],
  }

  // @ts-ignore
  await Bun.write(`${projectName}/tsconfig.json`, JSON.stringify(tsconfig, null, 2))
  console.log('✓ Created tsconfig.json')
}

/**
 * Install dependencies
 */
async function installDependencies(projectName: string, skipInstall: boolean): Promise<void> {
  if (skipInstall) {
    console.log('Skipping dependency installation.')
    return
  }

  console.log('Installing dependencies...')
  console.log('Running: bun install')

  await $`cd ${projectName} && bun install`.quiet()

  console.log('✓ Dependencies installed')
}

/**
 * Create .gitignore
 */
async function createGitignore(projectName: string): Promise<void> {
  console.log('Creating .gitignore...')

  const content = `# Dependencies
node_modules/

# Build output
dist/
build/

# IDE
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*
`

  // @ts-ignore
  await Bun.write(`${projectName}/.gitignore`, content)
  console.log('✓ Created .gitignore')
}

/**
 * Print success message with next steps
 */
function printSuccess(projectName: string): void {
  console.log('\n✨ CLI project initialized successfully!\n')

  console.log('Next steps:')
  console.log('  1. cd ' + projectName)
  console.log('  2. Edit src/index.ts to add your commands')
  console.log('  3. Run: bun run dev --help')
  console.log('  4. Run: bun run dev hello --caps')
  console.log('\nHappy coding! 🚀\n')
}

/**
 * Main initialization function
 */
async function init(options: InitOptions = {}): Promise<void> {
  const projectName = options.projectName || 'my-cli'

  console.log('\n🚀 Initializing Commander.js CLI project: ' + projectName + '\n')

  // Check if directory already exists
  if (await exists(projectName)) {
    if (!options.force) {
      console.log("Directory '" + projectName + "' already exists. Use --force to overwrite.")
      return
    }
  }

  // Create project structure
  await createDirectories(projectName)
  await createPackageJson(projectName, options.force || false)
  await createTsConfig(projectName)
  await generateIndex(projectName)
  await createGitignore(projectName)
  await installDependencies(projectName, options.skipInstall || false)

  printSuccess(projectName)
}

/**
 * CLI entry point
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2)

  const options: InitOptions = {
    projectName: undefined,
    skipInstall: false,
    force: false,
  }

  // Parse simple arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === '--skip-install') {
      options.skipInstall = true
    } else if (arg === '--force') {
      options.force = true
    } else if (!arg.startsWith('--')) {
      options.projectName = arg
    }
  }

  await init(options)
}

// Run if executed directly
// @ts-ignore
if (import.meta.main) {
  main().catch((error: Error) => {
    console.error('Error:', error.message)
    process.exit(1)
  })
}

export { init }
