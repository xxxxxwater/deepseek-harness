import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'
import { standardDecoratorPlugin, vitestExecArgv } from '../../vitest.shared.ts'
export default defineConfig({
  plugins: [tsconfigPaths({ projects: ['./tsconfig.base.json'], loose: true }), standardDecoratorPlugin()],
  test: { include: ['plugins/jev-layer/tests/**/*.spec.ts'], execArgv: vitestExecArgv, testTimeout: 30000 },
})
