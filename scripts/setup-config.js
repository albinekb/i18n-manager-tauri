const pathJoin = require('path').join
const config = require('../src-tauri/tauri.conf.json')

const isCI = process.env.CI === 'true'

const prodConfig = {
  ...config,
  build: {
    ...config.build,
    beforeBuildCommand: isCI
      ? 'yarn ci:tauri:before-build'
      : config.build.beforeBuildCommand,
  },
  tauri: {
    ...config.tauri,
    updater: {
      ...config.tauri.updater,
      endpoints: config.tauri.updater.endpoints.filter((endpoint) =>
        endpoint.startsWith('https://'),
      ),
    },
  },
}

require('fs').writeFileSync(
  pathJoin(__dirname, '../src-tauri/tauri.conf.prod.json'),
  JSON.stringify(prodConfig, null, 2),
)

if (!isCI) {
  if (prodConfig.tauri.updater.pubkey) {
    if (!process.env.TAURI_PRIVATE_KEY) {
      throw new Error('TAURI_PRIVATE_KEY is not defined')
    }
  }
}

// tauri-action does not read custom config at the moment... https://github.com/tauri-apps/tauri-action/pull/327
if (isCI) {
  require('fs').writeFileSync(
    pathJoin(__dirname, '../src-tauri/tauri.conf.json'),
    JSON.stringify(prodConfig, null, 2),
  )
}
