import React, {
  Dispatch,
  Provider,
  SetStateAction,
  useEffect,
  useMemo,
  useState,
} from 'react'
import useProject, { Project } from '../project/hooks/useProject'
import { FormProvider, useForm } from 'react-hook-form'

type TProjectContext = {
  project: Project
  selected: string | null
  setSelected: (selected: string | null) => void
  setAdded: Dispatch<SetStateAction<string[]>>
  added: string[]
  expanded: string[]
  setExpanded: Dispatch<SetStateAction<string[]>>
}
const ProjectContext = React.createContext<TProjectContext>(null)

type Props = {
  children: React.ReactNode
  path: string
}

export const expandKey = (setExpanded, selected: string) => {
  const nodes = selected.split('.')
  if (!nodes?.length) {
    return
  }
  setExpanded((expanded) => {
    if (expanded.includes(nodes.slice(0, -1).join('.'))) {
      document
        .querySelector(`[data-id="${selected}"]`)

        ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      return expanded
    }
    if (nodes.length === 1) {
      return [...new Set([...expanded, selected])]
    } else {
      const next = nodes.reduce((acc, curr) => {
        if (acc.length) {
          return [...acc, `${acc[acc.length - 1]}.${curr}`]
        }
        return [curr]
      }, [])

      return [...new Set([...expanded, ...next])]
    }
  })
}

export default function ProjectContextProvider({ children, path }: Props) {
  const project = useProject(path)

  const [selected, setSelected] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string[]>([])
  const [added, setAdded] = useState<string[]>([])
  useEffect(() => {
    if (typeof window === 'undefined') return
    import('@tauri-apps/api/window').then(({ appWindow }) => {
      appWindow.setTitle(path)
    })
  }, [path])

  const value = useMemo(
    () => ({
      project,
      selected,
      setSelected,
      added,
      setAdded,
      expanded,
      setExpanded,
    }),
    [project, selected, setSelected, added, setAdded, expanded, setExpanded],
  )
  if (!project) return null

  return (
    <ProjectContext.Provider value={value}>
      {project?.languageTree && (
        <ProjectFormProvider project={project}>{children}</ProjectFormProvider>
      )}
    </ProjectContext.Provider>
  )
}

function ProjectFormProvider({
  children,
  project,
}: {
  children: React.ReactNode
  project: Project
}) {
  const methods = useForm({
    defaultValues: project.languageTree,
  })

  useEffect(() => {
    if (project.languageTree) {
      methods.reset(project.languageTree)
    }
  }, [project.languageTree])

  return <FormProvider {...methods}>{children}</FormProvider>
}

export function useProjectContext() {
  return React.useContext(ProjectContext)
}
