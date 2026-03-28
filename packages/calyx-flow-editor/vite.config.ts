import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    dts({
      tsconfigPath: './tsconfig.app.json',
      entryRoot: 'src',
      insertTypesEntry: true,
      include: ['src'],
    }),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  build: {
    lib: {
      entry: resolve(__dirname, './src/index.ts'),
      formats: ['es'],
      fileName: 'index',
      cssFileName: 'tailwind',
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime', '@xyflow/react', 'calyx-flow'],
    },
  },
})
