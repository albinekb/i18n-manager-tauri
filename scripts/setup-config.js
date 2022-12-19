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
