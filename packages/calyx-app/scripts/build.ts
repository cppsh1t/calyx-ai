/// <reference types="bun" />

import { readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, relative, resolve } from 'node:path'

const entrypoints = [
  './src/index.ts',
  './src/types/index.ts',
  './src/config/index.ts',
  './src/auth/index.ts',
  './src/providers/index.ts',
  './src/logging/index.ts',
]

const declarationPattern = /(['"])@\/([^'"]+\.ts)\1/g

await rm('./dist', { recursive: true, force: true })

const result = await Bun.build({
  entrypoints,
  outdir: './dist',
  target: 'bun',
  format: 'esm',
  sourcemap: 'external',
})

if (!result.success) {
  for (const log of result.logs) {
    console.error(log)
  }

  process.exit(1)
}

const declarations = Bun.spawn(['bunx', 'tsc', '-p', 'tsconfig.build.json'], {
  cwd: process.cwd(),
  stdin: 'inherit',
  stdout: 'inherit',
  stderr: 'inherit',
})

const exitCode = await declarations.exited

if (exitCode !== 0) {
  process.exit(exitCode)
}

await rewriteDeclarationAliases('./dist')

async function rewriteDeclarationAliases(directory: string): Promise<void> {
  const entries = await readdir(directory, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = resolve(directory, entry.name)

    if (entry.isDirectory()) {
      await rewriteDeclarationAliases(fullPath)
      continue
    }

    if (!entry.isFile() || !entry.name.endsWith('.d.ts')) {
      continue
    }

    const source = await readFile(fullPath, 'utf8')
    const rewritten = source.replace(declarationPattern, (_match, quote: string, specifier: string) => {
      const distTarget = resolve('./dist', specifier.replace(/\.ts$/, '.js'))
      let nextSpecifier = relative(dirname(fullPath), distTarget).replaceAll('\\', '/')

      if (!nextSpecifier.startsWith('.')) {
        nextSpecifier = `./${nextSpecifier}`
      }

      return `${quote}${nextSpecifier}${quote}`
    })

    if (rewritten !== source) {
      await writeFile(fullPath, rewritten, 'utf8')
    }
  }
}
