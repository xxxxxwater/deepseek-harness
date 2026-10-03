/** Built-artifact installation checks require the host library build. */
import { defineConfig } from 'vitest/config'
import config from './vitest.config.ts'
export default defineConfig({
  ...config,
  test: { ...config.test, include: ['plugins/jev-layer/tests/installation.spec.ts'], exclude: [] },
})
