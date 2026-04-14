import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'index.ts',
    core: 'src/core/index.ts',
    services: 'src/services/index.ts',
    types: 'src/types/index.ts',
    ai: 'src/ai.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  splitting: false,
  target: 'node18',
  platform: 'node',
  outDir: 'dist',
  outExtension({ format }) {
    return {
      js: format === 'cjs' ? '.cjs' : '.js',
    }
  },
})
