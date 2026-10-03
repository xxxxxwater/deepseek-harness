import { defineConfig } from 'tsdown'
export default defineConfig({
  entry: ['src/index.ts'], outDir: 'lib',
  fixedExtension: false, format: 'esm', platform: 'node', target: 'node22', dts: false, sourcemap: false,
  deps: { neverBundle: [/^@deepseek-ai\//], alwaysBundle: ['zod'] },
})
