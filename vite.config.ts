import { resolve } from 'node:path'
import dts from 'vite-plugin-dts'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  build: {
    target: 'es2022',
    sourcemap: true,
    minify: false,
    lib: {
      entry: resolve(import.meta.dirname, 'src/index.ts'),
      formats: ['es'],
      fileName: () => 'index.js'
    },
    rollupOptions: {
      // The library has zero runtime dependencies, so nothing needs externalising.
      external: []
    }
  },
  plugins: [
    dts({
      include: ['src'],
      // Renamed from `rollupTypes` in vite-plugin-dts 5.
      bundleTypes: true,
      tsconfigPath: resolve(import.meta.dirname, 'tsconfig.json')
    })
  ],
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      reporter: ['text', 'html']
    }
  }
})
