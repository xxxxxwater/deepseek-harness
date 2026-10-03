/** Real profile package operations against the release archive, without provider credentials. */
import { mkdtemp, readFile, rm, writeFile, mkdir } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { expect, it, onTestFinished } from 'vitest'
import { initProfile, loadProfileDirectory, composeEntries, readProfilePlugins } from '@deepseek-ai/dsh-app-boot'
import { runProfilePnpm } from '../../../packages/boot/plugin-manager/src/operations.ts'
import { writePluginEnabled } from '../../../packages/boot/plugin-manager/src/patch.ts'

const packageName = '@puregamma/dsh-jev-layer'
const archive = resolve('plugins/jev-layer/releases/puregamma-dsh-jev-layer-0.1.0.tgz')
const installSpec = process.env.DSH_JEV_INSTALL_SPEC ?? archive
const pnpm = resolve('node_modules/pnpm/bin/pnpm.cjs')
const execute = promisify(execFile)

it('installs the release through the application package service, loads its patch, disables and removes it', async () => {
  const home = await mkdtemp(join(tmpdir(), 'jev-installed-'))
  onTestFinished(() => rm(home, { recursive: true, force: true }))
  const dir = join(home, 'profiles', 'test')
  const installAnchor = resolve('apps/cli/package.json')
  initProfile(dir, [])
  const context = { home, dir, profile: 'test', installAnchor, cwd: home }
  const options = { command: process.execPath, args: [pnpm], execution: 'service' as const,
    outputBytes: 16384, idleTimeoutMs: 15000 }
  const result = await runProfilePnpm(context, ['add', installSpec, ...(installSpec === archive ? ['--offline'] : [])], options)
  expect(result.exitCode, result.output).toBe(0)
  expect(result.timedOut).toBeUndefined()
  const location = { binName: 'dsh', profileDir: dir, installAnchor }
  expect(readProfilePlugins(location).dependencies).toContainEqual({
    name: packageName, version: '0.1.0', bundle: true, enabled: true,
  })
  const profile = loadProfileDirectory('dsh', dir, installAnchor)
  expect(profile.skippedBundles).toEqual([])
  const entries = composeEntries([...profile.layers.map(layer => layer.patches), profile.patches])
  expect(entries).toContainEqual(expect.objectContaining({
    id: 'puregamma-jev-layer', name: packageName,
    config: expect.objectContaining({ decisionModel: 'jev-latest', subagentProvider: 'spawn' }),
  }))
  // Built Node resolution is isolated in a child; no global resolver hooks reach other tests.
  const child = await execute(process.execPath, [resolve('plugins/jev-layer/tests/fixtures/installed-import.mjs'),
    dir, installAnchor], { timeout: 20000, maxBuffer: 16384 })
  expect(child.stdout.trim()).toBe('installed bundle imported with host peers')
  await writePluginEnabled(profile.patchPath, 'puregamma-jev-layer', packageName, false)
  const disabled = loadProfileDirectory('dsh', dir, installAnchor)
  expect(composeEntries([...disabled.layers.map(layer => layer.patches), disabled.patches]))
    .toContainEqual(expect.objectContaining({ id: 'puregamma-jev-layer', disabled: true }))
  const removed = await runProfilePnpm(context, ['remove', packageName], options)
  expect(removed.exitCode, removed.output).toBe(0)
  expect(readProfilePlugins(location).dependencies).toEqual([])
  expect(loadProfileDirectory('dsh', dir, installAnchor).layers).toEqual([])
})

it('rejects incompatible plugin peers before installation without changing the profile manifest', async () => {
  const home = await mkdtemp(join(tmpdir(), 'jev-incompatible-'))
  onTestFinished(() => rm(home, { recursive: true, force: true }))
  const dir = join(home, 'profiles', 'test')
  initProfile(dir, [])
  const candidate = join(home, 'incompatible')
  await mkdir(candidate)
  const manifest = JSON.parse(await readFile(resolve('plugins/jev-layer/package.json'), 'utf8'))
  manifest.peerDependencies['@deepseek-ai/dsh-agent'] = '999.0.0'
  await writeFile(join(candidate, 'package.json'), JSON.stringify(manifest))
  const before = await readFile(join(dir, 'package.json'), 'utf8')
  const result = await runProfilePnpm({ home, dir, profile: 'test', installAnchor: resolve('apps/cli/package.json'), cwd: home },
    ['add', candidate, '--offline'], { command: process.execPath, args: [pnpm], execution: 'service', outputBytes: 16384 })
  expect(result.exitCode).toBe(1)
  expect(result.incompatible).toHaveLength(1)
  expect(result.output).toContain('nothing was installed')
  expect(await readFile(join(dir, 'package.json'), 'utf8')).toBe(before)
})
