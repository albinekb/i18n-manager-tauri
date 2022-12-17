import dynamic from 'next/dynamic'
import { useRouter } from 'next/router'

import { useEffect, useState } from 'react'
import ProjectContextProvider from '../components/app/ProjectContext'
import useProject from '../components/project/hooks/useProject'
import SelectedEditor from '../components/project/SelectedEditor'

import TreeNavigator from '../components/project/TreeNavigator'

const ProjectStatusBar = dynamic(
  import('../components/project/ProjectStatusBar'),
  { ssr: false },
)

export default function Project() {
  const { path } = useRouter().query as { path: string }

  if (!path) return null

  return (
    <ProjectContextProvider path={path}>
      <div className='flex flex-col overflow-hidden w-full'>
        <div className='flex flex-row overflow-hidden flex-1 w-full'>
          <TreeNavigator />
          <SelectedEditor />
        </div>

        <ProjectStatusBar />
      </div>
    </ProjectContextProvider>
  )
}
