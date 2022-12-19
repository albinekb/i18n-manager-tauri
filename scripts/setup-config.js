const pathJoin = require('path').join
const config = require('../src-tauri/tauri.conf.json')

const prodConfig = {
  ...config,
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

if (prodConfig.tauri.updater.pubkey && !process.env.CI) {
  if (!process.env.TAURI_PRIVATE_KEY) {
    throw new Error('TAURI_PRIVATE_KEY is not defined')
  }
}
