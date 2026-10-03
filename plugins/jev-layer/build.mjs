/** Build and pack the optional plugin from the checked-out Harness development environment. */
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
const plugin = dirname(fileURLToPath(import.meta.url))
const root = resolve(plugin, '../..')
for (const args of [
  ['exec', 'tsc', '-b', 'plugins/jev-layer/tsconfig.json'],
  ['exec', 'tsdown', '--config', 'plugins/jev-layer/tsdown.config.ts'],
]) {
  const run = spawnSync('pnpm', args, { cwd: root, stdio: 'inherit' })
  if (run.status !== 0) process.exit(run.status ?? 1)
}
const pack = spawnSync('npm', ['pack', '--ignore-scripts', '--pack-destination', 'releases'], {
  cwd: plugin, encoding: 'utf8',
})
if (pack.status !== 0) { process.stderr.write(pack.stderr); process.exit(pack.status ?? 1) }
const filename = pack.stdout.trim().split('\n').at(-1)
const digest = createHash('sha256').update(readFileSync(resolve(plugin, 'releases', filename))).digest('hex')
writeFileSync(resolve(plugin, 'releases', 'SHA256SUMS'), `${digest}  ${filename}\n`)
console.log(`Created ${filename}; SHA256 ${digest}`)
