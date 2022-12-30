import React, { memo, useEffect, useMemo } from 'react'

import { TreeItem, TreeView } from '@mui/lab'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import { findKeys, KeyTree } from '../../lib/keyTree'
import {
  IconButton,
  InputAdornment,
  LinearProgress,
  Stack,
  TextField,
  Toolbar,
} from '@mui/material'
import flatten from 'flat'
import MiniSearch from 'minisearch'
import { ContextMenu } from '../shared/ContextMenu'
import { useController, useFormContext, useFormState } from 'react-hook-form'
import dotProp from 'dot-prop'
import {
  Clear,
  ExpandMore,
  SearchTwoTone,
  UnfoldLess,
  WarningOutlined,
} from '@mui/icons-material'
import clsx from 'clsx'
import traverse from 'traverse'
import sortOn from 'sort-on'
import StaticBadge from '../shared/StaticBadge'
import TreeNavigatorToolbar from '../TreeNavigator/TreeNavigatorToolbar'
import {
  expandedAtom,
  expandKeys,
  keyTreeAtom,
  projectLanguagesAtom,
  projectLanguageTreeAtom,
  searchStringAtoms,
  selectedAtom,
  selectedKeyAtom,
} from '../app/atoms'
import { atom } from 'jotai/vanilla'
import { useAtom, useAtomValue } from 'jotai/react'
import { LanguageTree } from '../../lib/project'
type Props = {}

const RenderTreeForm = memo(
  function RenderTreeForm({
    nodes,
    expanded,
    selected,
  }: {
    nodes: KeyTree
    expanded: string[] | null
    selected: string | null
  }) {
    const formStateDisabled =
      Array.isArray(nodes.children) ||
      !nodes.parent ||
      !expanded?.includes(nodes.parent)

    const { isDirty } = formStateDisabled
      ? { isDirty: false }
      : useFormContext().getFieldState(nodes.id)
    // const { dirtyFields } = useFormState({
    //   control,
    //   name: nodes.id,
    // })
    // const isDirty = dotProp.get(dirtyFields, nodes.id, false)

    // console.log('dirtyFields', dirtyFields)

    const isParent = Array.isArray(nodes.children)
    const isSelected = selected === nodes.id
    const count = isParent ? nodes?.children?.length : null
    const childExpanded = useMemo(() => {
      if (!isParent) return null
      const filtered = expanded?.filter((key) => key.startsWith(nodes.id))
      return filtered?.length ? filtered : null
    }, [expanded, nodes.id])

    return (
      <TreeItem
        key={nodes.id}
        nodeId={nodes.id}
        label={
          <Stack
            direction='row'
            alignItems='center'
            justifyContent='space-between'
            className='h-10'
          >
            <span
              className={clsx(
                isDirty && 'font-semibold',
                'font-weight-[inherit]',
              )}
              style={
                nodes?.score
                  ? { backgroundColor: `rgba(0,255,0,${nodes.score / 100})` }
                  : undefined
              }
            >
              {nodes.name}
            </span>
            {count && <StaticBadge badgeContent={count} color='primary' />}
            {isDirty && <WarningOutlined fontSize='small' />}
          </Stack>
        }
        // classes={
        //   matches.includes(nodes.name)
        //     ? { label: 'underline font-bold' }
        //     : undefined
        // }
        data-id={nodes.id}
        data-type={isParent ? 'parent' : 'value'}
        endIcon={isParent ? <ExpandMoreIcon /> : undefined}
        // className={clsx(isSelected && 'bg-gray-100')}
        classes={
          isSelected
            ? { expanded: 'font-extralight', iconContainer: 'text-2xl' }
            : {
                focused: 'bg-transparent',
                selected: 'bg-transparent',
                expanded: 'font-extralight',
                iconContainer: 'text-2xl',
              }
        }
      >
        {isParent
          ? nodes?.children?.map((node) =>
              node ? (
                <RenderTreeForm
                  key={node.id}
                  nodes={node}
                  expanded={childExpanded}
                  selected={selected}
                />
              ) : null,
            )
          : null}
      </TreeItem>
    )
  },
  (prevProps, nextProps) => {
    return (
      prevProps.nodes.id === nextProps.nodes.id &&
      (prevProps.expanded === nextProps.expanded ||
        prevProps.expanded?.length === nextProps.expanded?.length) &&
      prevProps.selected === nextProps.selected
    )
  },
)
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

export default function TreeNavigator({}: Props) {
  const keysFlat = useAtomValue(keysFlatAtom)
  const languageTree = useAtomValue(projectLanguageTreeAtom)

  const languages = useAtomValue(projectLanguagesAtom)
  const debouncedSearchString = useAtomValue(searchStringAtoms.currentValueAtom)
  const searchString = useAtomValue(searchStringAtoms.debouncedValueAtom)
  const isSearching = useAtomValue(searchStringAtoms.isDebouncingAtom)
  const [expanded, setExpanded] = useAtom(expandedAtom)
  const [selected, setSelected] = useAtom(selectedAtom)
  const keyTree = useAtomValue(keyTreeAtom)
  // console.log(keysFlat)

  const miniSearch = useMemo(() => {
    return new MiniSearch({
      fields: ['key', ...languages],
      storeFields: ['key', ...languages],
      // processTerm: (term) => term.toLowerCase(), // index term processing
      // tokenize: (string) => [string], // indexing tokenizer
      // searchOptions: {
      //   processTerm: (term) => term.toLowerCase(), // search query processing
      // },
      // searchOptions: {
      //   tokenize: (string) => [string],
      //   // .split(/[\s-]+/) // search query tokenizer
      // },
    })
  }, [languages])

  useEffect(() => {
    miniSearch.removeAll()
    miniSearch.addAll(keysFlat)
  }, [keysFlat, miniSearch])

  const searchEmpty = searchString === ''
  useEffect(() => {
    if (searchString === '' && expanded?.length && !selected) {
      setExpanded([])
    }
  }, [searchEmpty])

  // const fuse = useMemo(() => {
  //   if (!keyTree?.length) return
  //   const options: Fuse.IFuseOptions<KeyTree> = {
  //     includeScore: true,
  //     includeMatches: true,
  //     findAllMatches: false,
  //     shouldSort: true,

  //     keys: [
  //       'name',
  //       'children.name',
  //       'children.children.name',
  //       'children.children.children.name',
  //       'children.children.children.children.name',
  //       'children.children.children.children.children.name',
  //       'children.children.children.children.children.children.name',
  //     ],
  //   }

  //   return new Fuse<KeyTree>(keyTree, options)
  // }, [keyTree])

  // useEffect(() => {
  //   if (!debouncedSearch || !keysFlat?.length || !miniSearch) return

  //   const results = miniSearch?.search(debouncedSearch, {
  //     boost: { value: 3, key: 2 },
  //   })
  //   console.log('miniSearch results', results)

  //   if (results?.length) {
  //     const top = results.slice(0, 50)
  //     setMatches(top.map((result) => result.path).filter(Boolean))
  //     const expanded: string[] = top.reduce((expanded, result) => {
  //       const { path, score } = result
  //       const parent = path.split('.').slice(0, -1)
  //       if (parent?.length) {
  //         if (parent.length === 1) {
  //           return [...expanded, parent[0]]
  //         }
  //         const next = parent.reduce((acc, curr) => {
  //           if (acc.length) {
  //             return [...acc, `${acc[acc.length - 1]}.${curr}`]
  //           }
  //           return [curr]
  //         }, [])
  //         return [...expanded, ...next]
  //       } else {
  //         return [...expanded, path]
  //       }
  //     }, [] as string[])

  //     const unique = [...new Set(expanded)]

  //     if (unique?.length) {
  //       setExpanded(unique)
  //     }
  //   } else {
  //     setMatches([])
  //   }
  // }, [debouncedSearch, keysFlat, miniSearch])

  // useEffect(() => {
  //   if (selected) {
  //     const nodes = selected.split('.')
  //     if (!nodes?.length) {
  //       return
  //     }
  //     if (expanded.includes(nodes.slice(0, -1).join('.'))) {
  //       document
  //         .querySelector(`[data-id="${selected}"]`)

  //         ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  //       return
  //     }
  //     if (nodes.length === 1) {
  //       setExpanded((prev) => [...new Set([...prev, selected])])
  //     } else {
  //       const next = nodes.reduce((acc, curr) => {
  //         if (acc.length) {
  //           return [...acc, `${acc[acc.length - 1]}.${curr}`]
  //         }
  //         return [curr]
  //       }, [])
  //       setExpanded((prev) => [...new Set([...prev, ...next])])
  //       document
  //         .querySelector(`[data-id="${selected}"]`)
  //         ?.scrollIntoView({ behavior: 'smooth' })
  //     }
  //   }
  // }, [selected])

  const results = useMemo(() => {
    if (!debouncedSearchString || !miniSearch || searchEmpty) return null
    return miniSearch.search(debouncedSearchString, {
      fuzzy: 1,
    })
  }, [miniSearch, debouncedSearchString])

  useEffect(() => {
    if (results?.length) {
      const [first] = results
      setSelected(first.id)
      setExpanded(expandKeys(results.slice(0, 10).map((result) => result.id)))
    }
  }, [results])

  const searched = useMemo(() => {
    if (!debouncedSearchString || !miniSearch || searchEmpty) return keyTree

    // console.log('json', miniSearch.toJSON())

    const obj = results?.reduce((obj: any, curr) => {
      for (const lang of languages) {
        const id = `${curr.id}.${lang}`
        obj[id] = curr[lang]
      }
      obj[`${curr.id}.score`] = curr.score

      return obj
    }, {} as any)
    const unflattened = flatten.unflatten(obj)
    const tree = findKeys(unflattened as any, '', languages)

    return tree

    // const filteredTree = traverse(keyTree).map(function () {
    //   // const key = this.key
    //   const node = this.node
    //   const thisPath = this.path
    //   const thisKey = this.key
    //   const thisLongPath = thisPath.join('.')
    //   const isKeyTree = typeof node === 'object' && 'id' in node
    //   const hasChildren =
    //     isKeyTree && 'children' in node && node.children?.length
    //   const isLeaf = isKeyTree && !hasChildren
    //   const nodeId = isKeyTree ? node.id : thisKey
    //   const parent = this.parent
    //   const parentNode =
    //     typeof parent === 'object' && 'id' in parent ? parent : null
    //   const name = isKeyTree ? node.name : parentNode?.name
    //   const keyMatch = isKeyTree && results.some(({ key }) => key === name)
    //   if (!keyMatch) {
    //     if (isKeyTree && results.every(({ id }) => !id.startsWith(nodeId))) {
    //       this.remove()
    //     } else if (name && !results.some(({ key }) => key === name)) {
    //       console.log(name)
    //       if (isLeaf) {
    //         this.remove()
    //       }
    //     }
    //   }
    //   // if (!paths.some((path) => path.startsWith(node.id))) {

    //   //   // this.remove()
    //   // }
    // })

    // return filteredTree
    // const results = fuse.search(debouncedSearchString)
    // console.log(results)

    // return results
    //   .filter((result) => result.score < 0.05)
    //   .map((result) => result.item)
  }, [keysFlat, keyTree, results, miniSearch])
  // useEffect(() => {
  //   if (!results?.length) return
  //   const [first] = results
  //   const [match] = first.matches
  //   console.log(match)
  //   return
  //   const parent = match.value.split('.').slice(0, -1)
  //   if (parent?.length) {
  //     const next = parent.reduce((acc, curr) => {
  //       if (acc.length) {
  //         return [...acc, `${acc[acc.length - 1]}.${curr}`]
  //       }
  //       return [curr]
  //     }, [])
  //     console.log(next)
  //     // setExpanded([...expanded, ...parent])
  //     setExpanded(next)
  //   } else {
  //     setExpanded([match.value])
  //   }
  // }, [results])

  return (
    <div className='flex flex-col w-80 overflow-hidden height-full pt-4 bg-gray-50'>
      <TreeNavigatorToolbar />
      <ContextMenu className='flex overflow-hidden'>
        {isSearching ? (
          <LinearProgress variant='query' className='w-full mx-4' />
        ) : (
          <TreeView
            aria-label='file system navigator'
            defaultCollapseIcon={<ExpandMoreIcon />}
            defaultExpandIcon={<ChevronRightIcon />}
            onNodeSelect={(e: any, nodeId: string) => {
              const isLeaf = dotProp.get(
                languageTree,
                `${nodeId}.__leaf`,
                false,
              )
              if (isLeaf) {
                setSelected(nodeId)
              }
            }}
            onNodeToggle={(e, nodeIds: string[]) =>
              setExpanded(expandKeys(nodeIds))
            }
            expanded={expanded}
            sx={{ flexGrow: 1, overflowY: 'auto' }}
          >
            {searched && (
              <RenderTree
                keyTree={searched}
                expanded={expanded}
                selected={selected}
              />
            )}
          </TreeView>
        )}
      </ContextMenu>
    </div>
  )
}

function RenderTree({
  keyTree,
  expanded,
  selected,
}: {
  keyTree: KeyTree[]
  expanded: string[]
  selected: string | null
}) {
  return (
    <>
      {keyTree?.map((tree) => (
        <RenderTreeForm
          key={tree.id}
          nodes={tree}
          expanded={expanded.filter((id) => id.startsWith(tree.id))}
          selected={selected}
        />
      )) || null}
    </>
  )
}
