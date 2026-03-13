#!/usr/bin/env bun
import solidPlugin from '@opentui/solid/bun-plugin'

// Set production environment for build
process.env.NODE_ENV = 'production'

const platformMap: Record<string, string> = {
  'darwin-x64': 'bun-darwin-x64',
  'darwin-arm64': 'bun-darwin-arm64',
  'linux-x64': 'bun-linux-x64',
  'linux-arm64': 'bun-linux-arm64',
  'win32-x64': 'bun-windows-x64',
}

console.log('Building Calyx CLI...')

const key = `${process.platform}-${process.arch}`
if (!(key in platformMap)) {
  throw new Error(`Unsupported platform: ${key}`)
}

const outfile = `dist/calyx${process.platform === 'win32' ? '.exe' : ''}`

const result = await Bun.build({
  entrypoints: ['./src/index.tsx'],
  target: 'bun',
  minify: true,
  plugins: [solidPlugin],
  compile: {
    target: platformMap[key] as Bun.Build.CompileTarget,
    outfile: outfile,
    autoloadBunfig: false,
  },
})

if (!result.success) {
  console.error('Build failed:')
  for (const log of result.logs) {
    console.error(log)
  }
  process.exit(1)
}

console.log(`✅ Build complete! Output: ./${outfile}`)
