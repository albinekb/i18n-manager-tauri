import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/tauri'
import { open } from '@tauri-apps/api/dialog'

import { readDir, BaseDirectory } from '@tauri-apps/api/fs'
import { useRouter } from 'next/router'
// import { WebviewWindow } from '@tauri-apps/api/window'

function App() {
  const router = useRouter()
  const [greetMsg, setGreetMsg] = useState('')
  const [name, setName] = useState('')
  const [recent, setRecent] = useState<string[]>([])

  useEffect(() => {
    import('tauri-plugin-store-api')
      .then(({ Store }) => new Store('.settings.dat'))
      .then((store) =>
        store.get('latest-pick').then((path: string) => {
          if (path) setRecent([path])
        }),
      )
  }, [])

  async function greet() {
    // Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
    setGreetMsg(await invoke('greet', { name }))
  }

  async function openPath(path: string) {
    await invoke('allow_directory', { path })

    router.push({
      pathname: '/project',
      query: { path },
    })
    // const { WebviewWindow } = await import('@tauri-apps/api/window')
    // const webview = new WebviewWindow('theUniqueLabel', {
    //   url: `/project?path=${selected}`,
    // })
  }

  async function openDirectory() {
    const selected = await open({
      multiple: false,
      directory: true,
    })
    const store = await import('tauri-plugin-store-api').then(
      ({ Store }) => new Store('.settings.dat'),
    )
    if (selected && !Array.isArray(selected)) {
      const dir = await readDir(selected)
      if (!dir.length || !dir.some((file) => file.name?.endsWith('.json'))) {
        alert('No JSON files found in this directory')
        return
      }
      await store.set('latest-pick', selected)
      openPath(selected)
    }
  }

  return (
    <div className='container'>
      <h1>Welcome to Tauri!</h1>
      <button onClick={openDirectory}>Open Directory</button>

      <p>Click on the Tauri, Next, and React logos to learn more.</p>

      <div className='row'>
        {recent?.map((path) => (
          <div key={path} onClick={() => openPath(path)}>
            {path}
          </div>
        ))}
      </div>

      <p>{greetMsg}</p>
    </div>
  )
}

export default App
