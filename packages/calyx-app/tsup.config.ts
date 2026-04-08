import { defineConfig } from 'tsup'

export default defineConfig({
  tsconfig: 'tsconfig.app.json',
  entry: {
    index: 'src/index.ts',
    types: 'src/types/index.ts',
    config: 'src/config/index.ts',
    auth: 'src/auth/index.ts',
    providers: 'src/providers/index.ts',
    logging: 'src/logging/index.ts',
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
