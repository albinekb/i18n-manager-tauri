import { readTextFile } from '@tauri-apps/api/fs'
import { atom, Setter } from 'jotai'
import { focusAtom } from 'jotai-optics'
import atomWithDebounce from '../../lib/atomWithDebounce'
import { findLanguage, getSystemLocale } from '../../lib/getSystemLocale'
import { getProjectName } from '../../lib/project'
import { KeyTree } from '../../lib/keyTree'
import {
  getLanguageTree,
  getProjectLanguageFiles,
  LanguageTree,
  LangFile,
} from '../../lib/project'
export type TranslationState = {
  fromLanguage: string | null
  toLanguages: string[]
  mode: 'all' | 'this'
  overwrite: boolean
}

export const initialTranslationState: TranslationState = {
  fromLanguage: null,
  toLanguages: [],
  mode: 'this',
  overwrite: false,
}

type ProjectInfo = {
  projectPath: string
  projectName: string
}

const systemLocaleAtom = atom<Promise<string>>(getSystemLocale)

export const projectPathAtom = atom<string | null>(null)

const projectNameAtom = atom<Promise<string | null> | string>(async (get) => {
  const projectPath = get(projectPathAtom)
  if (!projectPath) return null
  const projectName = await getProjectName(projectPath)
  return projectName
})

export const projectInfoAtom = atom<Promise<ProjectInfo | null>, string>(
  async (get) => {
    const projectPath = get(projectPathAtom)
    const projectName = get(projectNameAtom)
    if (!projectPath || !projectName) return null
    return {
      projectPath,
      projectName,
    }
  },
  (get, set, projectPath) => {
    set(projectPathAtom, projectPath)
  },
)
// async (get, set) => {
//   // await something
//   // set(countAtom, get(countAtom) + 1)
// },

export const projectLangFiles = atom<Promise<LangFile[]>>(async (get) => {
  const projectPath = get(projectPathAtom)
  if (!projectPath) return []
  const files = await getProjectLanguageFiles(projectPath)
  if (!files?.length) {
    console.error('No files found in project')
    return []
  }

  return files
})
export const projectLanguagesAtom = atom<string[]>((get) =>
  get(projectLangFiles).map((file) => file.lang),
)
const derivedProjectDataAtom = atom<Promise<LanguageTree>>(async (get) => {
  const files = get(projectLangFiles)
  if (!files?.length) return {}
  const loaded: any = {}
  for (const file of files) {
    const contents = await readTextFile(file.path)
    const json = JSON.parse(contents)
    loaded[file.lang] = json
  }

  return loaded
})

const savedProjectDataAtom = atom<LanguageTree | null>(null)
export const projectDataAtom = atom<LanguageTree, LanguageTree>(
  (get) => get(savedProjectDataAtom) || get(derivedProjectDataAtom),
  (get, set, data) => {
    set(savedProjectDataAtom, data)
  },
)

export const projectLanguageTreeAtom = atom<LanguageTree>((get) => {
  const data = get(projectDataAtom)
  const languages = get(projectLanguagesAtom)

  if (!languages.length || !data) return {}

  const tree = getLanguageTree({ data, languages })
  return tree
})
export const keyTreeAtom = atom<KeyTree[]>([])

const savedTranslationStateAtom = atom<TranslationState | null>(null)
const derivedTranslationStateAtom = atom<Promise<TranslationState>>(
  async (get) => {
    const languages = get(projectLanguagesAtom)
    const systemLanguage = await get(systemLocaleAtom)

    if (!languages?.length || !systemLanguage) return initialTranslationState
    const fromLanguage = findLanguage(languages, systemLanguage)
    const toLanguages = languages.filter((l) => l !== fromLanguage)
    const state: TranslationState = {
      fromLanguage,
      toLanguages,
      mode: 'this',
      overwrite: false,
    }

    return state
  },
)
export const translationAtom = atom<
  Promise<TranslationState>,
  Partial<TranslationState>
>(
  async (get) => {
    const savedState = get(savedTranslationStateAtom)
    if (savedState) return savedState
    const derivedState = await get(derivedTranslationStateAtom)
    return derivedState
  },
  (get, set, state) => {
    const derivedState = get(derivedTranslationStateAtom)
    const savedState = get(savedTranslationStateAtom)
    set(savedTranslationStateAtom, { ...derivedState, ...savedState, ...state })
  },
)
export const selectedAtom = atom<string | null>(null)
export const addedAtom = atom<string[]>([])
export const deletedAtom = atom<string[]>([])
export const expandedAtom = atom<string[]>([])
export const searchStringAtoms = atomWithDebounce('', 300)
export const searchStringAtom = searchStringAtoms.currentValueAtom

const focusKey = (selected: string) => {
  const key = document.querySelector(`[data-id="${selected}"]`)
  if (key) {
    window.requestAnimationFrame(() => {
      key?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    })
    return true
  }
}

export const expandKeys = (selected: string[]) => {
  const expanded: string[] = []
  for (const key of selected) {
    const nodes = key.split('.')
    if (!nodes?.length || nodes.length === 1) {
      expanded.push(key)
      continue
    }

    const next = nodes.reduce((acc: string[], curr) => {
      if (acc.length) {
        return [...acc, `${acc[acc.length - 1]}.${curr}`]
      }
      return [curr]
    }, [])

    expanded.push(...next)
  }

  return expanded
}

const expandKey = (set: Setter, selected: string, focus = false) => {
  const nodes = selected.split('.')

  if ((focus && focusKey(selected)) || !nodes?.length) {
    return
  }

  set(expandedAtom, (expanded) => {
    if (nodes.length === 1) {
      return [...new Set([...expanded, selected])]
    } else {
      const next = nodes.reduce((acc, curr) => {
        if (acc.length) {
          return [...acc, `${acc[acc.length - 1]}.${curr}`]
        }
        return [curr]
      }, [] as string[])

      return [...new Set([...expanded, ...next])]
    }
  })

  if (focus) focusKey(selected)
}

export const selectedKeyAtom = atom((get) => get(selectedAtom))

export const selectKeyAtom = atom(null, (_get, set, key: string) => {
  set(selectedAtom, () => key)
  expandKey(set, key, true)
})

export const contextMenuAtom = atom<{
  mouseX: number
  mouseY: number
  data: any
} | null>(null)
