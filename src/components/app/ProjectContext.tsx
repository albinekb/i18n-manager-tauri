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
import { useDebounce } from 'usehooks-ts'
import { findLanguage, getSystemLocale } from '../../lib/getSystemLocale'

export type TranslationState = {
  fromLanguage: string | null
  toLanguages: string[]
  mode: 'all' | 'this'
  overwrite: boolean
}

const initialTranslationState: TranslationState = {
  fromLanguage: null,
  toLanguages: [],
  mode: 'this',
  overwrite: false,
}

type TProjectContext = {
  project: Project
  selected: string | null
  setSelected: (selected: string | null) => void
  setAdded: Dispatch<SetStateAction<string[]>>
  added: string[]
  setDeleted: Dispatch<SetStateAction<string[]>>
  deleted: string[]
  expanded: string[]
  setExpanded: Dispatch<SetStateAction<string[]>>
  searchString: string
  setSearchString: Dispatch<SetStateAction<string>>
  debouncedSearchString: string
  translationState: [
    TranslationState,
    Dispatch<SetStateAction<TranslationState>>,
  ]
}
const ProjectContext = React.createContext<TProjectContext>(null)

type Props = {
  children: React.ReactNode
  path: string
}

const focusKey = (selected: string) => {
  const key = document.querySelector(`[data-id="${selected}"]`)
  if (key) {
    window.requestAnimationFrame(() => {
      key?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    })
    return true
  }
}

export const selectKey = (
  projectContext: TProjectContext,
  selected: string,
) => {
  const { setSelected, setExpanded } = projectContext
  setSelected(selected)
  expandKey(setExpanded, selected, true)
}

export const expandKeys = (selected: string[]) => {
  const expanded = []
  for (const key of selected) {
    const nodes = key.split('.')
    if (!nodes?.length || nodes.length === 1) {
      expanded.push(key)
      continue
    }

    const next = nodes.reduce((acc, curr) => {
      if (acc.length) {
        return [...acc, `${acc[acc.length - 1]}.${curr}`]
      }
      return [curr]
    }, [])

    expanded.push(...next)
  }

  return expanded
}

const expandKey = (setExpanded, selected: string, focus = false) => {
  const nodes = selected.split('.')

  if ((focus && focusKey(selected)) || !nodes?.length) {
    return
  }
  setExpanded((expanded) => {
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
  if (focus) focusKey(selected)
}

export default function ProjectContextProvider({ children, path }: Props) {
  const project = useProject(path)

  const [selected, setSelected] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string[]>([])
  const [added, setAdded] = useState<string[]>([])
  const [deleted, setDeleted] = useState<string[]>([])
  const [searchString, setSearchString] = useState<string>('')
  const translationState = useState<TranslationState>(initialTranslationState)
  const debouncedSearchString = useDebounce(searchString, 500)
  const hasFromLanguage = Boolean(translationState[0].fromLanguage)
  useEffect(() => {
    if (!project?.languages?.length || hasFromLanguage) {
      return
    }

    async function init() {
      const [, setState] = translationState

      const fromLanguage = await findLanguage(project.languages)

      setState((state) => {
        const toLanguages = state.toLanguages?.length
          ? state.toLanguages.filter((l) => l !== fromLanguage)
          : project.languages.filter((l) => l !== fromLanguage)
        return { ...state, fromLanguage, toLanguages }
      })
    }

    init()
  }, [project.languages, hasFromLanguage])

  const value = useMemo(
    () => ({
      project,
      selected,
      setSelected,
      added,
      setAdded,
      expanded,
      setExpanded,
      deleted,
      setDeleted,
      searchString,
      setSearchString,
      debouncedSearchString,
      translationState,
    }),
    [
      project,
      selected,
      setSelected,
      added,
      setAdded,
      expanded,
      setExpanded,
      deleted,
      setDeleted,
      searchString,
      setSearchString,
      debouncedSearchString,
      translationState,
    ],
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
