import React, { Provider, useEffect, useMemo, useState } from 'react'
import useProject, { Project } from '../project/hooks/useProject'
import { FormProvider, useForm } from 'react-hook-form'

type TProjectContext = {
  project: Project
  selected: string | null
  setSelected: (selected: string | null) => void
}
const ProjectContext = React.createContext<TProjectContext>(null)

type Props = {
  children: React.ReactNode
  path: string
}

export default function ProjectContextProvider({ children, path }: Props) {
  const project = useProject(path)
  const methods = useForm({
    defaultValues: project.languageTree,
  })

  useEffect(() => {
    if (project.languageTree) {
      methods.reset(project.languageTree)
    }
  }, [project.languageTree])

  const [selected, setSelected] = useState<string | null>(null)
  useEffect(() => {
    if (typeof window === 'undefined') return
    import('@tauri-apps/api/window').then(({ appWindow }) => {
      appWindow.setTitle(path)
    })
  }, [path])

  const value = useMemo(
    () => ({ project, selected, setSelected }),
    [project, selected, setSelected],
  )
  if (!project) return null

  return (
    <FormProvider {...methods}>
      <ProjectContext.Provider value={value}>
        {children}
      </ProjectContext.Provider>
    </FormProvider>
  )
}

export function useProjectContext() {
  return React.useContext(ProjectContext)
}
