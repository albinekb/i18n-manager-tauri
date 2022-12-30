import { Suspense } from 'react'

import { Button, Stack } from '@mui/material'
import useOpenProject from '../app/hooks/useOpenProject'
import RecentProjects from './RecentProjects'
import { useAtomValue } from 'jotai/react'
import { recentProjectsAtom } from '../../store/atoms'

const Preloader = () => {
  useAtomValue(recentProjectsAtom) // Trigger the "onMount" function that will load the data from the store
  return null
}

function HomeScreen() {
  const { openDirectory } = useOpenProject()

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
      <Suspense fallback={<div>Loading...</div>}>
        <Preloader />
        <RecentProjects />
      </Suspense>
    </div>
  )
}

export default HomeScreen
