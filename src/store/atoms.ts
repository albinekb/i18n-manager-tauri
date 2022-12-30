import { readTextFile } from '@tauri-apps/api/fs'
import { atom, Setter } from 'jotai/vanilla'

import atomWithDebounce from '../lib/atomWithDebounce'
import { findLanguage, getSystemLocale } from '../lib/getSystemLocale'
import { getProjectName } from '../lib/project'
import { KeyTree } from '../lib/keyTree'
import { atomWithCache } from 'jotai-cache'
import {
  getLanguageTree,
  getProjectLanguageFiles,
  LanguageTree,
  LangFile,
} from '../lib/project'
import {
  atomWithTauriStorage,
  TauriAsyncStorage,
} from '../lib/atoms/TauriAsyncStorage'
import uniqBy from 'lodash.uniqby'
import { defaultCacheOptions } from '../lib/atoms/helpers'

export const cacheStorage = new TauriAsyncStorage('.cache.dat')

export type RecentProject = {
  path: string
  name: string
  lastOpenedAt?: Date
}

export const recentProjectsAtom = atomWithTauriStorage<RecentProject[]>(
  'recent-projects',
  [] as RecentProject[],
  cacheStorage,
)

export const appendRecentProjectAtom = atom<null, [RecentProject], void>(
  null,
  (get, set, { name, path }) => {
    const recent = get(recentProjectsAtom)
    const lastOpenedAt = new Date()
    const next = uniqBy(
      [{ name, path, lastOpenedAt }, ...recent],
      'path',
    ).slice(0, 5)
    set(recentProjectsAtom, next)
  },
)
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

const projectNameAtom = atomWithCache(async (get) => {
  const projectPath = get(projectPathAtom)
  if (!projectPath) return null
  const projectName = await getProjectName(projectPath)
  return projectName
}, defaultCacheOptions)

export const projectInfoAtom = atom<
  Promise<ProjectInfo | null> | null | ProjectInfo,
  [string],
  void
>(
  async (get) => {
    const projectPath = get(projectPathAtom)
    if (!projectPath) return null
    const projectName = await get(projectNameAtom)
    if (!projectName) return null
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
export const projectLanguagesAtom = atom<Promise<string[]>>(async (get) => {
  const files = get(projectLangFiles)
  const resolved = await Promise.resolve(files)
  if (resolved) {
    return files.then((files) => files.map((file) => file.lang))
  }

  return []
})

const derivedProjectDataAtom = atom<Promise<LanguageTree>>(async (get) => {
  const files = await get(projectLangFiles)
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
export const projectDataAtom = atom<
  Promise<LanguageTree | null> | LanguageTree | null,
  [LanguageTree],
  any
>(
  (get) => get(savedProjectDataAtom) || get(derivedProjectDataAtom),
  (get, set, data) => {
    set(savedProjectDataAtom, data)
  },
)

export const EMPTY_LANGUGAGE_TREE: LanguageTree = { __empty: 'true' }
export const projectLanguageTreeAtom = atom<Promise<LanguageTree>>(
  async (get) => {
    const data = await get(projectDataAtom)
    const languages = await get(projectLanguagesAtom)

    if (!languages.length || !data) return EMPTY_LANGUGAGE_TREE

    const tree = getLanguageTree({ data, languages })
    return tree
  },
)
export const keyTreeAtom = atom<KeyTree[]>([])

const savedTranslationStateAtom = atom<TranslationState | null>(null)
const derivedTranslationStateAtom = atom<Promise<TranslationState>>(
  async (get) => {
    const languages = await get(projectLanguagesAtom)
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
  [Partial<TranslationState>],
  Promise<TranslationState>
>(
  async (get) => {
    const savedState = get(savedTranslationStateAtom)
    if (savedState) return savedState
    const derivedState = await get(derivedTranslationStateAtom)
    return derivedState
  },
  async (get, set, state) => {
    const derivedState = await get(derivedTranslationStateAtom)
    const savedState = get(savedTranslationStateAtom)
    const nextState = { ...derivedState, ...savedState, ...state }
    set(savedTranslationStateAtom, nextState)
    return nextState
  },
)
export const selectedAtom = atom<string | null>(null)
export const addedAtom = atom<string[]>([])
export const deletedAtom = atom<string[]>([])
export const expandedAtom = atom<string[]>([])
export const searchStringAtoms = atomWithDebounce('', 300)

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
  return [...new Set([...selected])].sort((a, b) => {
    // sort by depth
    const aDepth = a.split('.').length
    const bDepth = b.split('.').length
    if (aDepth > bDepth) return 1
    if (aDepth < bDepth) return -1

    // sort by length
    if (a.length > b.length) return 1
    if (a.length < b.length) return -1

    // sort by name
    if (a > b) return 1
    if (a < b) return -1

    return 0
  })

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
