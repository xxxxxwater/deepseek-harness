/** Install the optional PureGamma UI bundles without replacing any user configuration. */
import { cpSync, existsSync, lstatSync, mkdirSync, readFileSync, readlinkSync, renameSync, symlinkSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

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
        symlinkSync(destination, link, 'dir')
      }
    } else symlinkSync(destination, link, 'dir')
    manifest.dependencies[name] = 'link:../../local-plugins/' + name
    if (!manifest.dsh.profile.bundles.includes(name)) manifest.dsh.profile.bundles.push(name)
  }
  const pending = manifestPath + '.pg-pending'
  writeFileSync(pending, JSON.stringify(manifest, null, 2) + '\n', { mode: 0o600 })
  renameSync(pending, manifestPath)
  return backup
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log('PureGamma Harness UI installed. Backup: ' + install())
}
