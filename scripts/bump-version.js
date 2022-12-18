const semver = require('semver')
const path = require('path')
const fs = require('fs')

const packageJsonPath = path.join(__dirname, '../package.json')
const packageJson = require(packageJsonPath)

const level = process.argv[process.argv.length - 1] || 'patch'
if (level === 'none') {
  console.log('Skipping version bump')
  process.exit(0)
}
console.log('Bumping version', level)
const version = semver.inc(packageJson.version, level)

packageJson.version = version

const tauriConfigPath = path.join(__dirname, '../src-tauri/tauri.conf.json')
const tauriConfig = require(tauriConfigPath)

tauriConfig.package.version = version

fs.writeFileSync(tauriConfigPath, JSON.stringify(tauriConfig, null, 2))

fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2))
