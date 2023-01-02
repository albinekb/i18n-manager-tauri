import dynamic from 'next/dynamic'
import { useRouter } from 'next/router'
import { Suspense } from 'react'

import SelectedEditor from '../components/project/SelectedEditor'

import TreeNavigator from '../components/project/TreeNavigator'
import { ContextMenu } from '../components/shared/ContextMenu'
import SuspenseProgress from '../components/shared/SuspenseProgress'
import ProjectContextProvider from '../components/app/ProjectContext'
import ProjectStatusBar from '../components/project/ProjectStatusBar'

export default function Project() {
  const router = useRouter()
  const path = router.isReady ? (router.query.path as string) : null

  if (!path) return null

  return (
    <ProjectContextProvider path={path}>
      <ContextMenu />
      <div className='flex flex-col overflow-hidden w-full'>
        <div className='flex flex-row overflow-hidden flex-1 w-full'>
          <TreeNavigator />
          <Suspense fallback={<SuspenseProgress />}>
            <SelectedEditor />
          </Suspense>
        </div>
        <ProjectStatusBar />
      </div>
    </ProjectContextProvider>
  )
}
