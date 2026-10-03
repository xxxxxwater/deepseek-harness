/** Import the installed ESM archive using the host's real runtime peer resolution. */
import assert from 'node:assert/strict'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { boot, createRuntimeResolution, loadProfileDirectory, PluginPackages } from '../../../../packages/boot/app-boot/lib/index.js'
import { readFile, writeFile } from 'node:fs/promises'
import Schema from '../../../../vendor/schemastery/lib/index.mjs'
const [dir, installAnchor] = process.argv.slice(2)
const profile = loadProfileDirectory('dsh', dir, installAnchor)
const resolution = await createRuntimeResolution({ installAnchor, profile, home: resolve(dir, '../..') })
const configuration = join(dir, 'cordis.yml')
const fixture = await readFile(new URL('./cordis.yml', import.meta.url), 'utf8')
await writeFile(configuration, fixture.split('- id: puregamma-jev-layer')[0])
const ctx = await boot('jev-installed', configuration, profile.layers.flatMap(layer => layer.patches),
  root => root.plugin(PluginPackages, { resolution }), pathToFileURL(dir).href + '/')
try {
  const plugin = await import(pathToFileURL(join(dir, 'node_modules/@puregamma/dsh-jev-layer/lib/index.js')).href)
  assert.equal(plugin.name, 'puregamma-jev-layer')
  assert.equal('default' in plugin, false)
  assert.ok(plugin.Config instanceof Schema)
  assert.equal(plugin.Config({}).subagentProvider, 'spawn')
  assert.equal(typeof plugin.apply, 'function')
  assert.deepEqual(ctx.tools.schemas().filter(tool => tool.name.startsWith('jev_')).map(tool => tool.name).sort(),
    ['jev_decide', 'jev_delegate', 'jev_review'])
  const entry = [...ctx.loader.entries()].find(item => item.options.id === 'puregamma-jev-layer')
  assert.ok(entry?.fiber)
  await entry.fiber.dispose()
  assert.equal(ctx.tools.get('jev_decide'), undefined)
  console.log('installed bundle imported with host peers')
} finally {
  await ctx.fiber.dispose()
}
