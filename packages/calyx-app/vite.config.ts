import { builtinModules } from 'node:module'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

const nodeBuiltins = [...builtinModules, ...builtinModules.map((m) => `node:${m}`)]

/**
 * Multi-entry library build for calyx-app.
 *
 * Each subpath gets its own JS chunk so that consumers can import
 * individual modules without pulling in the full bundle.
 */
const entries = {
  index: resolve(__dirname, './src/index.ts'),
  types: resolve(__dirname, './src/types/index.ts'),
  config: resolve(__dirname, './src/config/index.ts'),
  auth: resolve(__dirname, './src/auth/index.ts'),
  providers: resolve(__dirname, './src/providers/index.ts'),
  logging: resolve(__dirname, './src/logging/index.ts'),
}

export default defineConfig({
  plugins: [
    dts({
      tsconfigPath: './tsconfig.app.json',
      entryRoot: 'src',
      insertTypesEntry: true,
      include: ['src'],
    }),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  build: {
    lib: {
      entry: entries,
      formats: ['es'],
    },
    rollupOptions: {
      external: nodeBuiltins,
    },
  },
})
