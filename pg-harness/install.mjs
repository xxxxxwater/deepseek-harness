/** Install the optional PureGamma UI bundles without replacing any user configuration. */
import { cpSync, existsSync, lstatSync, mkdirSync, readFileSync, readlinkSync, realpathSync, renameSync, symlinkSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { installUniverPreviewBridge } from './plugin-patches/univer-office/patch.mjs'
import { installBundledPluginCompatibility } from './plugin-patches/bundled-compat.mjs'

/**
 * Install PureGamma UI packages into the reserved desktop profile with reversible backups.
 * @param home - Harness data directory, normally the existing .dsh directory.
 * @returns the backup directory created for this installation.
 */
export function install(home = process.env.DSH_HOME || join(homedir(), '.dsh')) {
  const profile = join(home, 'profiles', 'desktop')
  if (existsSync(join(profile, 'lock'))) throw new Error('Quit Harness before installing the PureGamma UI bundles.')
  const source = join(dirname(fileURLToPath(import.meta.url)), 'plugins')
  const backup = join(home, 'pg-harness-backups', new Date().toISOString().replaceAll(':', '-') + '-' + process.pid)
  mkdirSync(backup, { recursive: true, mode: 0o700 })
  mkdirSync(join(profile, 'node_modules'), { recursive: true })
  for (const name of ['package.json', 'pnpm-lock.yaml', 'cordis.patch.yml']) {
    const file = join(profile, name)
    if (existsSync(file)) cpSync(file, join(backup, name))
  }
  const manifestPath = join(profile, 'package.json')
  const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : {
    name: 'dsh-profile-desktop', private: true, dependencies: {},
    dsh: { profile: { bundles: ['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app'] } },
  }
  manifest.dependencies ??= {}
  manifest.dsh ??= {}
  manifest.dsh.profile ??= {}
  manifest.dsh.profile.bundles ??= ['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app']
  for (const name of ['dsh-plugin-rail', 'dsh-vscode-code-theme', 'dsh-imessage-blue', 'dsh-pixel-font']) {
    const destination = join(home, 'local-plugins', name)
    if (existsSync(destination)) cpSync(destination, join(backup, name), { recursive: true })
    cpSync(join(source, name), destination, { recursive: true })
    const link = join(profile, 'node_modules', name)
    if (existsSync(link) || (() => { try { return lstatSync(link).isSymbolicLink() } catch { return false } })()) {
      if (!lstatSync(link).isSymbolicLink() || resolve(dirname(link), readlinkSync(link)) !== resolve(destination)) {
        renameSync(link, join(backup, name + '-previous-link'))
        symlinkSync(destination, link, 'junction')
      }
    } else symlinkSync(destination, link, 'junction')
    manifest.dependencies[name] = 'link:../../local-plugins/' + name
    if (!manifest.dsh.profile.bundles.includes(name)) manifest.dsh.profile.bundles.push(name)
  }
  const inventoryPath = join(dirname(fileURLToPath(import.meta.url)), 'bundled-plugins', 'inventory.json')
  if (existsSync(inventoryPath)) {
    const inventory = JSON.parse(readFileSync(inventoryPath, 'utf8'))
    for (const plugin of inventory.plugins) {
      // A user's installed version, dependency source and settings take precedence.
      if (manifest.dependencies[plugin.name] !== undefined) continue
      const archive = join(dirname(inventoryPath), plugin.archive)
      if (createHash('sha256').update(readFileSync(archive)).digest('hex') !== plugin.sha256) {
        throw new Error('Bundled plugin archive failed its integrity check: ' + plugin.name)
      }
      const destination = join(home, 'bundled-plugin-archives', plugin.archive)
      mkdirSync(dirname(destination), { recursive: true })
      cpSync(archive, destination)
      manifest.dependencies[plugin.name] = 'file:../../bundled-plugin-archives/' + plugin.archive
    }
    for (const bundle of inventory.bundles) {
      if (!manifest.dsh.profile.bundles.includes(bundle)) manifest.dsh.profile.bundles.push(bundle)
    }
  }
  const pending = manifestPath + '.pg-pending'
  writeFileSync(pending, JSON.stringify(manifest, null, 2) + '\n', { mode: 0o600 })
  renameSync(pending, manifestPath)
  installUniverPreviewBridge(profile, backup)
  installBundledPluginCompatibility(profile, backup)
  return backup
}

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const home = process.env.DSH_HOME || join(homedir(), '.dsh')
  const backup = install(home)
  const profile = join(home, 'profiles', 'desktop')
  const manifest = JSON.parse(readFileSync(join(profile, 'package.json'), 'utf8'))
  const missing = Object.keys(manifest.dependencies).some(name => !existsSync(join(profile, 'node_modules', name, 'package.json')))
  if (missing) {
    const resources = resolve(dirname(fileURLToPath(import.meta.url)), '..')
    const pnpm = join(resources, 'runtime', 'primary-runtime', 'dependencies', 'pnpm', 'bin', 'pnpm.mjs')
    if (!existsSync(pnpm)) throw new Error('Run the installer beside the packaged PureGamma Harness app.')
    const workspace = join(profile, 'pnpm-workspace.yaml')
    if (!existsSync(workspace)) writeFileSync(workspace, 'packages:\n  - .\nnodeLinker: hoisted\nautoInstallPeers: false\n')
    execFileSync(process.execPath, [pnpm, '--dir', profile, 'install', '--no-frozen-lockfile', '--ignore-scripts'], {
      stdio: 'inherit', env: { ...process.env, ELECTRON_RUN_AS_NODE: '1', NODE_OPTIONS: '' },
    })
  }
  installUniverPreviewBridge(profile, backup)
  installBundledPluginCompatibility(profile, backup)
  console.log('PureGamma Harness plugins installed. Backup: ' + backup)
}
