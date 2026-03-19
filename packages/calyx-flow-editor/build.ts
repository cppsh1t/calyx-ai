#!/usr/bin/env bun
import { build } from 'bun'
import { execSync } from 'child_process'
import { existsSync } from 'fs'
import { mkdir, rm } from 'fs/promises'
import path from 'path'
import { createGenerator } from 'unocss'
import unoConfig from './uno.config.ts'

const outdir = path.join(process.cwd(), 'dist')

async function clean() {
  if (existsSync(outdir)) {
    console.log('🗑️  Cleaning previous build...')
    await rm(outdir, { recursive: true, force: true })
  }
  await mkdir(outdir, { recursive: true })
}

async function generateTypes() {
  console.log('📘 Generating TypeScript declarations...')
  try {
    execSync('tsc --emitDeclarationOnly', { stdio: 'inherit' })
    console.log('✅ Types generated successfully')
  } catch {
    console.error('❌ Type generation failed')
    process.exit(1)
  }
}

async function generateUnoCss() {
  console.log('🎨 Generating UnoCSS output...')
  try {
    const generator = await createGenerator(unoConfig)

    const contentChunks: string[] = []
    const scanner = new Bun.Glob('src/**/*.{ts,tsx}')
    for await (const filePath of scanner.scan('.')) {
      contentChunks.push(await Bun.file(filePath).text())
    }

    const { css } = await generator.generate(contentChunks.join('\n'), {
      preflights: true,
      minify: true,
    })

    await Bun.write(path.join(outdir, 'uno.css'), css)
    console.log('✅ UnoCSS generated successfully')
  } catch {
    console.error('❌ UnoCSS generation failed')
    process.exit(1)
  }
}

function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB']
  let size = bytes
  let unitIndex = 0

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`
}

async function buildLibrary() {
  const start = performance.now()

  await clean()

  console.log('📦 Building library...\n')

  const esmResult = await build({
    entrypoints: ['./src/index.ts'],
    outdir,
    format: 'esm',
    target: 'browser',
    external: ['react', 'react-dom', '@xyflow/react', 'calyx-flow'],
    minify: true,
    sourcemap: 'linked',
  })

  await generateUnoCss()
  await generateTypes()

  const end = performance.now()

  console.log('\n📁 Build outputs:')
  const allOutputs = [...esmResult.outputs]
  const outputTable = allOutputs.map((output) => ({
    File: path.relative(process.cwd(), output.path),
    Type: output.kind,
    Size: formatFileSize(output.size),
  }))
  console.table(outputTable)

  console.log(`\n✅ Build completed in ${(end - start).toFixed(2)}ms`)
  console.log(`📍 Output directory: ${outdir}`)
}

await buildLibrary()
