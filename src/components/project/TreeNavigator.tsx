import React, { memo, useEffect, useMemo } from 'react'

import { TreeItem, TreeView } from '@mui/lab'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import useKeyTree, { findKeys, KeyTree } from './hooks/useKeyTree'
import {
  IconButton,
  InputAdornment,
  LinearProgress,
  Stack,
  TextField,
  Toolbar,
} from '@mui/material'
import Fuse from 'fuse.js'
import { useDebounce } from 'usehooks-ts'
import flatten from 'flat'
import MiniSearch from 'minisearch'
import { Project } from './hooks/useProject'
import { ContextMenu } from '../shared/ContextMenu'
import { expandKeys, useProjectContext } from '../app/ProjectContext'
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
type Props = {}

const RenderTreeForm = ({
  nodes,
  matches,
  expanded,
  selected,
}: {
  nodes: KeyTree
  matches: string[]
  expanded: string[]
  selected: string
}) => {
  const formStateDisabled =
    Array.isArray(nodes.children) ||
    !nodes.parent ||
    !expanded.includes(nodes.parent)

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
  const isMatched = matches.includes(nodes.id)
  const count = isParent ? nodes.children.length : null

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
              label: clsx(isMatched && 'bg-green-100'),
              expanded: 'font-extralight',
              iconContainer: 'text-2xl',
            }
      }
    >
      {Array.isArray(nodes.children)
        ? nodes.children.map((node) =>
            node ? (
              <RenderTreeForm
                key={node.id}
                nodes={node}
                matches={matches}
                expanded={expanded}
                selected={selected}
              />
            ) : null,
          )
        : null}
    </TreeItem>
  )
}
const flatKeys = (tree: KeyTree[], languages) => {
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

  const keysFlat = Object.entries(flatten(tree, { delimiter: '.' }))
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

  const uniqueKeys = [...new Set(keysFlat.map((x) => x.path))]

  return uniqueKeys.map((path) => {
    const values = dotProp.get(tree, path)
    const translated = languages.reduce((acc, lang) => {
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

export default function TreeNavigator({}: Props) {
  const {
    project,
    setSelected,
    selected,
    expanded,
    setExpanded,
    searchString,
    setSearchString,
    debouncedSearchString,
  } = useProjectContext()
  const keyTree = useKeyTree(project)

  const keysFlat = useMemo(
    () =>
      project.languageTree
        ? flatKeys(project.languageTree, project.languages)
        : [],
    [project.languageTree],
  )
  // console.log(keysFlat)

  const miniSearch = useMemo(() => {
    return new MiniSearch({
      fields: ['key', ...project.languages],
      storeFields: ['key', ...project.languages],
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
  }, [project.languages])

  useEffect(() => {
    miniSearch.removeAll()
    miniSearch.addAll(keysFlat)
  }, [keysFlat, miniSearch])

  const [matches, setMatches] = React.useState<string[]>([])

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

    const obj = results.reduce((obj, curr) => {
      for (const lang of project.languages) {
        const id = `${curr.id}.${lang}`
        obj[id] = curr[lang]
      }
      obj[`${curr.id}.score`] = curr.score

      return obj
    }, {})
    const unflattened = flatten.unflatten(obj)
    const tree = findKeys(unflattened, '', project.languages)

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

  const isSearching = searchString && searchString !== debouncedSearchString

  return (
    <div className='flex flex-col w-80 overflow-hidden'>
      <TreeNavigatorToolbar />
      <ContextMenu className='flex overflow-hidden'>
        {isSearching ? (
          <LinearProgress variant='query' className='w-full mx-4' />
        ) : (
          <TreeView
            aria-label='file system navigator'
            defaultCollapseIcon={<ExpandMoreIcon />}
            defaultExpandIcon={<ChevronRightIcon />}
            onNodeSelect={(e, nodeId) => {
              const isLeaf = dotProp.get(
                project.languageTree,
                `${nodeId}.__leaf`,
                false,
              )
              if (isLeaf) {
                setSelected(nodeId)
              }
            }}
            onNodeToggle={(e, nodeId) => setExpanded(nodeId)}
            expanded={expanded}
            sx={{ flexGrow: 1, overflowY: 'auto' }}
          >
            <RenderTree
              keyTree={searched}
              matches={matches}
              expanded={expanded}
              selected={selected}
            />
          </TreeView>
        )}
      </ContextMenu>
    </div>
  )
}

const RenderTree = memo(function RenderTree({
  keyTree,
  matches,
  expanded,
  selected,
}: {
  keyTree: KeyTree[]
  matches: string[]
  expanded: string[]
  selected: string
}) {
  return (
    <>
      {keyTree?.map((tree) => (
        <RenderTreeForm
          key={tree.id}
          nodes={tree}
          matches={matches}
          expanded={expanded}
          selected={selected}
        />
      )) || null}
    </>
  )
})
