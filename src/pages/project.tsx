import dynamic from 'next/dynamic'
import { useRouter } from 'next/router'
import { Suspense } from 'react'

// import { useEffect, useState } from 'react'
// import ProjectContextProvider from
// import useProject from '../components/project/hooks/useProject'
import SelectedEditor from '../components/project/SelectedEditor'

import TreeNavigator from '../components/project/TreeNavigator'
import SuspenseProgress from '../components/shared/SuspenseProgress'

const ProjectStatusBar = dynamic(
  import('../components/project/ProjectStatusBar'),
  { ssr: false },
)

const ProjectContextProvider = dynamic(
  import('../components/app/ProjectContext'),
  { ssr: false },
)

export default function Project() {
  const path =
    (useRouter().query.path as string) ||
    (typeof window !== 'undefined'
      ? (new URLSearchParams(window.location.search).get('path') as string)
      : null)

  if (!path) return null

  return (
    <ProjectContextProvider path={path}>
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
