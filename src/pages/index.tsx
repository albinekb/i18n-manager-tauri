import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/tauri'
import { open } from '@tauri-apps/api/dialog'

import { readDir, BaseDirectory } from '@tauri-apps/api/fs'
import { useRouter } from 'next/router'
import {
  Button,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  Stack,
} from '@mui/material'
import { ChevronRight } from '@mui/icons-material'
import { join as pathJoin } from 'path'
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
        store.get('recent').then((paths: string[]) => {
          if (paths?.length) setRecent(paths)
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
        const files = (
          await Promise.all(
            dir.map((file, index) =>
              readDir(file.path).then((files) =>
                files.map((file) => ({
                  ...file,
                  lang: dir[index].name,
                })),
              ),
            ),
          )
        )
          .flatMap((found, index) => found)
          .filter((dir) => dir.name.endsWith('.json'))

        if (files.length) {
          await store.set('recent', [...new Set([selected, ...recent])])
          openPath(selected)
          return
        }
        alert('No JSON files found in this directory')
        return
      }
      await store.set('recent', [...new Set([selected, ...recent])])
      openPath(selected)
    }
  }

  return (
    <div className='flex flex-col w-full justify-center'>
      <Stack alignItems='center' spacing={4}>
        <h1>Welcome to Tauri!</h1>
        <div>
          <Button variant='outlined' onClick={openDirectory}>
            Open Directory
          </Button>
        </div>
      </Stack>

      <List subheader={<ListSubheader>Recent</ListSubheader>}>
        {recent?.map((path) => (
          <ListItemButton key={path} onClick={() => openPath(path)}>
            <ListItemText primary={path} />

            <ListItemIcon>
              <ChevronRight />
            </ListItemIcon>
          </ListItemButton>
        ))}
      </List>

      <p>{greetMsg}</p>
    </div>
  )
}

export default App
