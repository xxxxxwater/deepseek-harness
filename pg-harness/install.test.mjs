import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { install } from './install.mjs'

test('installation preserves third-party bundles and user settings and remains repeatable', () => {
  const home = mkdtempSync(join(tmpdir(), 'pg-install-'))
  try {
    const profile = join(home, 'profiles', 'desktop')
    mkdirSync(profile, { recursive: true })
    writeFileSync(join(profile, 'package.json'), JSON.stringify({ dependencies: { retained: '1.2.3' }, dsh: { profile: { bundles: ['retained'] } } }))
    writeFileSync(join(profile, 'cordis.patch.yml'), 'retained settings\n')
    writeFileSync(join(home, 'credentials.json'), 'retained credentials\n')
    install(home)
    install(home)
    const result = JSON.parse(readFileSync(join(profile, 'package.json'), 'utf8'))
    assert.equal(result.dependencies.retained, '1.2.3')
    assert.equal(result.dsh.profile.bundles[0], 'retained')
    const inventory = JSON.parse(readFileSync(new URL('./bundled-plugins/inventory.json', import.meta.url), 'utf8'))
    for (const bundle of inventory.bundles) assert.ok(result.dsh.profile.bundles.includes(bundle))
    for (const plugin of inventory.plugins) assert.equal(result.dependencies[plugin.name], 'file:../../bundled-plugin-archives/' + plugin.archive)
    assert.equal(readFileSync(join(profile, 'cordis.patch.yml'), 'utf8'), 'retained settings\n')
    assert.equal(readFileSync(join(home, 'credentials.json'), 'utf8'), 'retained credentials\n')
  } finally { rmSync(home, { recursive: true, force: true }) }
})

test('installation refuses an active desktop profile', () => {
  const home = mkdtempSync(join(tmpdir(), 'pg-install-'))
  try {
    mkdirSync(join(home, 'profiles', 'desktop'), { recursive: true })
    writeFileSync(join(home, 'profiles', 'desktop', 'lock'), 'active')
    assert.throws(() => install(home), /Quit Harness/)
  } finally { rmSync(home, { recursive: true, force: true }) }
})
