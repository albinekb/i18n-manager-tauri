import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/tauri'
import { open } from '@tauri-apps/api/dialog'

import { readDir, BaseDirectory } from '@tauri-apps/api/fs'
import { useRouter } from 'next/router'
import { Button, Stack } from '@mui/material'
import { ChevronRight } from '@mui/icons-material'
import { join as pathJoin } from 'path'
import useOpenProject from '../components/app/hooks/useOpenProject'
import RecentProjects from '../components/Home/RecentProjects'

// import { WebviewWindow } from '@tauri-apps/api/window'

function App() {
  const { openDirectory } = useOpenProject()
  const [greetMsg, setGreetMsg] = useState('')
  const [name, setName] = useState('')

  async function greet() {
    // Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
    setGreetMsg(await invoke('greet', { name }))
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

      <RecentProjects />
    </div>
  )
}

export default App
