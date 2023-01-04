import { FixedSizeTree } from 'react-vtree'
import { readTextFile } from '@tauri-apps/api/fs'
import { atom, Getter } from 'jotai/vanilla'

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
import { NodeData } from '../components/project/TreeNavigator'
import { createRef } from 'react'
import { flatten } from 'flat'
import dotProp from 'dot-prop'
import { _formContext } from '../components/app/ProjectContext'

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

export const isSavingProjectAtom = atom(false)

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

const systemLocaleAtom = atomWithCache<Promise<string>>(getSystemLocale)

export const projectPathAtom = atom<string | null, [], void>(
  (get) => get(projectInfoAtom)?.projectPath || null,
  (get, set) => {
    throw new Error('projectPathAtom should not be set directly')
  },
)

const handleSignal = (signal?: AbortSignal) => {
  if (signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError')
  }
}

const getProjectData = async (files: LangFile[], signal?: AbortSignal) => {
  handleSignal(signal)
  console.log('Loading project data')

  if (!files?.length) return {}
  const loaded: any = {}
  for (const file of files) {
    handleSignal(signal)
    const contents = await readTextFile(file.path)
    const json = JSON.parse(contents)
    loaded[file.lang] = json
  }

  return loaded
}

const _getProjectLanguageFiles = async (
  projectPath: string,
  signal?: AbortSignal,
) => {
  if (!projectPath) return []
  handleSignal(signal)
  const files = await getProjectLanguageFiles(projectPath)
  if (!files?.length) {
    console.error('No files found in project')
    return []
  }

  return files
}

const getTranslationState = async (get: Getter, languages: string[]) => {
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
}
export const setProjectPathAtom = atom<
  null,
  [string, AbortSignal?],
  Promise<void>
>(null, async (get, set, projectPath, signal) => {
  handleSignal(signal)
  if (projectPath) {
    const languageFiles = await _getProjectLanguageFiles(projectPath, signal)
    const languages = languageFiles.map((file) => file.lang)
    const [projectName, data, translationState] = await Promise.all([
      getProjectName(projectPath, signal),
      getProjectData(languageFiles, signal),
      getTranslationState(get, languages),
    ])

    const tree = getLanguageTree({ data, languages })

    handleSignal(signal)

    set(projectInfoAtomValue, {
      projectPath,
      projectName: projectName || '',
    })
    set(projectLangFiles, languageFiles)
    set(savedProjectDataAtom, data)
    set(savedTranslationStateAtom, translationState)
    set(projectLanguageTreeAtom, tree)
  } else {
    set(projectInfoAtomValue, null)
    set(projectLangFiles, [])
    set(savedProjectDataAtom, null)
    set(savedTranslationStateAtom, initialTranslationState)
    set(projectLanguageTreeAtom, EMPTY_LANGUGAGE_TREE)
  }
})

export const treeRef = createRef<FixedSizeTree<NodeData>>()

const projectInfoAtomValue = atom<ProjectInfo | null>(null)
export const projectInfoAtom = atom<ProjectInfo | null>((get) =>
  get(projectInfoAtomValue),
)
projectInfoAtom.debugLabel = 'projectInfoAtom'

export const projectLangFiles = atom<LangFile[]>([])
export const projectLanguagesAtom = atom<string[]>((get) => {
  console.log('Loading project languages')
  const files = get(projectLangFiles)

  return files.map((file) => file.lang)
})

const savedProjectDataAtom = atom<LanguageTree | null>(null)
export const projectDataAtom = atom<LanguageTree | null, [LanguageTree], any>(
  (get) => get(savedProjectDataAtom),
  (get, set, data) => {
    set(savedProjectDataAtom, data)
  },
)

export const EMPTY_LANGUGAGE_TREE: LanguageTree = { __empty: 'true' }
export const projectLanguageTreeAtom = atom<LanguageTree>(EMPTY_LANGUGAGE_TREE)
export const keyTreeAtom = atom<KeyTree[]>([])
export const getKeyTreeAtom = atom<KeyTree[]>((get) => get(keyTreeAtom))

const flatKeys = (
  tree: LanguageTree,
  languages: string[],
): Array<{ id: string; key: string; [key: string]: string }> => {
  const regexps = languages.map((lang) => ({
    lang,
    regexp: new RegExp(`\.${lang}$`),
  }))
  const getKey = (key: string) => {
    for (const { lang, regexp } of regexps) {
      const ending = `.${lang}`
      if (key.endsWith(ending)) {
        return [key.replace(regexp, ''), lang]
      }
    }
    return [key, null]
  }

  const keysFlat = Object.entries(
    flatten<LanguageTree, [string, any]>(tree, { delimiter: '.' }),
  )
    .filter(
      ([id, value]) => !id.includes('__leaf') && typeof value === 'string',
    )
    .map(([id, value]) => {
      const [withoutLang, lang] = getKey(id)
      return {
        id,
        value,
        path: withoutLang,
        key: withoutLang?.split('.')?.slice(-1)[0] || withoutLang,
        lang,
      }
    })

  const uniqueKeys = [...new Set(keysFlat.map((x) => x.path))].filter(Boolean)

  return uniqueKeys.map((path: string) => {
    const values: any = dotProp.get(tree, path)
    const translated = languages.reduce((acc: any, lang) => {
      const value = values?.[lang]
      if (value) {
        acc[lang] = value
      }

      return acc
    }, {})
    return {
      id: path,
      key: path.split('.').slice(-1)[0] || path,
      ...translated,
    }
  })
}

const keysFlatAtom = atom(async (get) => {
  const languageTree = await get(projectLanguageTreeAtom)
  const languages = await get(projectLanguagesAtom)
  if (languageTree) {
    return flatKeys(languageTree, languages)
  }
  return []
})

const savedTranslationStateAtom = atom<TranslationState | null>(null)

export const translationAtom = atom<
  TranslationState,
  [Partial<TranslationState>],
  TranslationState
>(
  (get) => {
    const savedState = get(savedTranslationStateAtom)
    if (savedState) return savedState
    return initialTranslationState
  },
  (get, set, state) => {
    const savedState = get(savedTranslationStateAtom)
    const nextState: TranslationState = {
      ...initialTranslationState,
      ...savedState,
      ...state,
    }
    set(savedTranslationStateAtom, nextState)
    return nextState
  },
)
type ArgumentTypes<F extends Function> = F extends (...args: infer A) => any
  ? A
  : never

const dirtyFieldsAtomValue = atom<string[]>([])
export const getDirtyFieldsAtom = atom<string[]>((get) =>
  get(dirtyFieldsAtomValue),
)
type Mutable<T> = {
  -readonly [P in keyof T]: T[P]
}
export const setDirtyFieldsAtom = atom<null, [string[]], void>(
  null,
  (get, set, dirty) => {
    const prev = get(dirtyFieldsAtomValue)
    if (
      (prev.length === 0 && dirty.length === 0) || // both empty
      (prev.length === dirty.length && prev.every((id) => dirty.includes(id)))
    ) {
      return
    }
    if (!treeRef.current) return
    type TreeUpdate = ArgumentTypes<typeof treeRef.current.recomputeTree>[0]
    const all = [...new Set([...prev, ...dirty])]
    const allRoots = [
      ...new Set(
        all.map((id) => {
          const parts = id.split('.')
          return parts.slice(0, parts.length - 1).join('.')
        }),
      ),
    ]
    const expanded = get(getExpandedAtom)
    const update: TreeUpdate = allRoots.reduce(
      (acc: Mutable<TreeUpdate>, root) => {
        acc[root] = {
          open: expanded.includes(root),
          subtreeCallback(node, ownerNode) {
            if (node === ownerNode) return
            if (dirty.includes(node.data.id)) {
              ;(node.data as NodeData).isDirty = true
            } else if (prev.includes(node.data.id)) {
              ;(node.data as NodeData).isDirty = false
            }
          },
        }
        return acc
      },
      {},
    )

    treeRef?.current?.recomputeTree(update)

    set(dirtyFieldsAtomValue, dirty)
  },
)

const selectedValueAtom = atom<string | null>(null)
export const selectedAtom = atom<string | null, [string | null], void>(
  (get) => get(selectedValueAtom),
  (get, set, selected) => {
    if (!treeRef?.current?.recomputeTree || !selected) return

    type TreeUpdate = ArgumentTypes<typeof treeRef.current.recomputeTree>[0]
    const prevSelected = get(selectedValueAtom)
    const parts = selected.split('.')
    const root = parts[0]
    const prevParts = prevSelected?.split('.') || []
    const prevRoot = prevParts[0]

    const update: TreeUpdate = {
      [root]: {
        open: true,
        subtreeCallback(node, ownerNode) {
          if (node === ownerNode) return
          if (node.data.id === selected) {
            ;(node.data as NodeData).isSelected = true
          } else if (
            prevRoot &&
            prevRoot === root &&
            node.data.id === prevSelected
          ) {
            ;(node.data as NodeData).isSelected = false
          }
        },
      },
      ...(prevRoot && prevRoot !== root
        ? {
            [prevRoot]: {
              open: true,
              subtreeCallback(node, ownerNode) {
                if (node === ownerNode) return
                if (node.data.id === prevSelected) {
                  ;(node.data as NodeData).isSelected = false
                }
              },
            },
          }
        : {}),
    }

    // prevSelectedRef.current = selected

    treeRef.current.recomputeTree(update).then(() => {
      treeRef.current?.scrollToItem(selected, 'smart')
    })

    set(selectedValueAtom, selected)
  },
)
export const addedAtom = atom<string[]>([])
type DeletedFieldState = {
  type: 'parent' | 'value'
  value: any
  defaultValue?: any
}

export const resetProjectChangesAtom = atom<null, [], void>(
  null,
  (get, set) => {
    set(addedAtom, [])
    set(deletedAtom, new Map())
    set(dirtyFieldsAtomValue, [])
    set(selectedValueAtom, null)
  },
)
const deletedAtom = atom<Map<string, DeletedFieldState>>(new Map())
export const setDeletedMapAtom = atom<
  null,
  [Map<string, DeletedFieldState>],
  void
>(null, (get, set, deleted) => {
  set(deletedAtom, deleted)
})
export const getDeletedMapAtom = atom<Map<string, DeletedFieldState>>((get) =>
  get(deletedAtom),
)
export const deletedKeysAtom = atom<string[]>((get) =>
  Array.from(get(deletedAtom).keys()),
)
export const deleteFieldAtom = atom<null, [string, DeletedFieldState], void>(
  null,
  (get, set, id, state) => {
    const deleted = get(deletedAtom)
    const next = new Map(deleted)
    next.set(id, state)
    set(deletedAtom, next)
  },
)
export const restoreDeletedFieldAtom = atom<null, [string], void>(
  null,
  (get, set, id) => {
    const deleted = get(deletedAtom)
    if (deleted.has(id)) {
      const deletedField = deleted.get(id)
      if (deletedField) {
        const value = deletedField.value
        const defaultValue = deletedField.defaultValue || value
        _formContext?.setValue(id, value)
        _formContext?.resetField(id, {
          defaultValue,
        })
        _formContext?.setValue(id, value, { shouldDirty: true })
        const next = new Map(deleted)
        next.delete(id)
        set(deletedAtom, next)
      }
    }
  },
)
const expandedAtomValue = atom<string[]>([])
export const hasExpandedAtom = atom<boolean>(
  (get) => get(expandedAtomValue).length > 0,
)
export const getExpandedAtom = atom<string[]>((get) => get(expandedAtomValue))
const setExpandedAtom = atom<null, [string[]], void>(
  null,
  (get, set, expanded) => {
    const prev = get(expandedAtomValue)
    if (!treeRef.current) return
    type TreeUpdate = ArgumentTypes<typeof treeRef.current.recomputeTree>[0]
  },
)

export const unfoldAllAtom = atom<null, [], void>(null, (get, set) => {
  const keyTree = get(keyTreeAtom)
  const roots = keyTree.map((node) => node.id)
  if (!treeRef.current) return
  type TreeUpdate = ArgumentTypes<typeof treeRef.current.recomputeTree>[0]
  const update: TreeUpdate = roots.reduce((acc: Mutable<TreeUpdate>, root) => {
    acc[root] = {
      open: true,
      subtreeCallback(node, ownerNode) {
        if (node === ownerNode) return
        node.isOpen = true
      },
    }
    return acc
  }, {})
  treeRef.current.recomputeTree(update)
  const getKeyTreeParents = (tree: KeyTree[]) =>
    tree.reduce((acc, node) => {
      if (node.children?.length) {
        acc.push(node.id)
        acc.push(...getKeyTreeParents(node.children))
      }
      return acc
    }, [] as string[])

  const allParents = getKeyTreeParents(keyTree)
  set(expandedAtomValue, allParents)
})
export const foldAllAtom = atom<null, [], void>(null, (get, set) => {
  const keyTree = get(keyTreeAtom)
  const roots = keyTree.map((node) => node.id)
  if (!treeRef.current) return
  type TreeUpdate = ArgumentTypes<typeof treeRef.current.recomputeTree>[0]
  const update: TreeUpdate = roots.reduce((acc: Mutable<TreeUpdate>, root) => {
    acc[root] = {
      open: false,
      subtreeCallback(node, ownerNode) {
        if (node === ownerNode) return
        node.isOpen = false
      },
    }
    return acc
  }, {})
  treeRef.current.recomputeTree(update)
  set(expandedAtomValue, [])
})

export const toggleExpandedAtom = atom<null, [string, boolean?], void>(
  null,
  (get, set, id, cascade = false) => {
    const expanded = get(getExpandedAtom)
    const isExpaned = expanded.includes(id)
    const nextIsExpanded = !isExpaned
    if (treeRef.current) {
      type TreeUpdate = ArgumentTypes<typeof treeRef.current.recomputeTree>[0]
      const update: TreeUpdate = {
        [id]: cascade
          ? {
              open: nextIsExpanded,
              subtreeCallback: (node, ownerNode) => {
                if (node === ownerNode) return
                node.isOpen = nextIsExpanded
              },
            }
          : nextIsExpanded,
      }
      treeRef.current.recomputeTree(update)
    }
    if (cascade) {
      const keyTree = get(keyTreeAtom)
      const getKeyTreeParents = (tree: KeyTree[]) =>
        tree.reduce((acc, node) => {
          if (node.children?.length) {
            if (node.id.startsWith(id)) {
              acc.push(node.id)
            }
            acc.push(
              ...getKeyTreeParents(node.children).filter((i) =>
                i.startsWith(id),
              ),
            )
          }
          return acc
        }, [] as string[])

      const nodeParents = getKeyTreeParents(keyTree)
      const nextExpanded = isExpaned
        ? expanded.filter((i) => !nodeParents.includes(i))
        : [...new Set([...expanded, ...nodeParents])]
      set(expandedAtomValue, nextExpanded)
      return
    }
    const nextExpanded = isExpaned
      ? expanded.filter((i) => i !== id)
      : [...new Set([...expanded, id])]
    set(expandedAtomValue, nextExpanded)
  },
)

export const expandedAtom = atom<string[], [string[]], void>(
  (get) => get(getExpandedAtom),
  (get, set, expanded) => {
    set(setExpandedAtom, expanded)
  },
)
export const searchStringAtoms = atomWithDebounce('', 300)

export const getSelectedKeyAtom = atom((get) => get(selectedAtom))

export const setSelectedKeyAtom = atom(
  null,
  (_get, set, key: string | null) => {
    set(selectedAtom, key)
  },
)

type ContextMenuProps = {
  mouseX: number
  mouseY: number
  data: any
  open?: boolean
}

const contextMenuAtom = atom<ContextMenuProps | null>(null)

export const getContextMenuAtom = atom((get) => get(contextMenuAtom))

export const openContextMenuAtom = atom<
  null,
  [Omit<ContextMenuProps, 'open'>],
  void
>(null, (get, set, props) => {
  set(contextMenuAtom, { ...props, open: true })
})

export const closeContextMenuAtom = atom<null, [], void>(null, (get, set) => {
  const current = get(contextMenuAtom)
  if (current) {
    set(contextMenuAtom, { ...current, open: false })
  }
})
