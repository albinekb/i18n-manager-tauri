import React, { memo, useEffect, useMemo } from 'react'

import { TreeItem, TreeView } from '@mui/lab'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import useKeyTree, { KeyTree } from './hooks/useKeyTree'
import {
  CircularProgress,
  IconButton,
  InputAdornment,
  LinearProgress,
  TextField,
} from '@mui/material'
import Fuse from 'fuse.js'
import { useDebounce } from 'usehooks-ts'
import flatten from 'flat'
import MiniSearch from 'minisearch'
import { Project } from './hooks/useProject'
import { ContextMenu } from '../shared/ContextMenu'
import { useProjectContext } from '../app/ProjectContext'
import { useController, useFormContext, useFormState } from 'react-hook-form'
import dotProp from 'dot-prop'
import { Clear } from '@mui/icons-material'

type Props = {}

const RenderTreeForm = ({
  nodes,
  matches,
  expanded,
}: {
  nodes: KeyTree
  matches: string[]
  expanded: string[]
}) => {
  const formStateDisabled =
    Array.isArray(nodes.children) ||
    !nodes.parent ||
    !expanded.includes(nodes.parent)
  console.log({
    name: nodes.id,
    disabled: formStateDisabled,
  })
  const { isDirty } = formStateDisabled
    ? { isDirty: false }
    : useFormContext().getFieldState(nodes.id)
  // const { dirtyFields } = useFormState({
  //   control,
  //   name: nodes.id,
  // })
  // const isDirty = dotProp.get(dirtyFields, nodes.id, false)

  // console.log('dirtyFields', dirtyFields)
  return (
    <TreeItem
      key={nodes.id}
      nodeId={nodes.id}
      label={nodes.name}
      className={isDirty ? 'bg-red-100' : ''}
      classes={
        matches.includes(nodes.name)
          ? { label: 'underline font-bold' }
          : undefined
      }
      data-id={nodes.id}
      data-type={Array.isArray(nodes.children) ? 'parent' : 'value'}
    >
      {Array.isArray(nodes.children)
        ? nodes.children.map((node) => (
            <RenderTreeForm
              key={node.id}
              nodes={node}
              matches={matches}
              expanded={expanded}
            />
          ))
        : null}
    </TreeItem>
  )
}
const flatKeys = (tree: KeyTree[]) => {
  console.log('flatkeys')
  return Object.entries(flatten(tree, { delimiter: '.' })).map(
    ([id, value]) => ({ id, value, key: id?.split('.')?.slice(-1)[0] || id }),
  )
}

export default function TreeNavigator({}: Props) {
  const { project, setSelected } = useProjectContext()
  const keyTree = useKeyTree(project)
  const [expanded, setExpanded] = React.useState<string[]>([])

  const [search, setSearch] = React.useState<string>('')
  const debouncedSearch = useDebounce(search, 500)
  const json = project?.data?.[project?.files?.[0]]
  const keysFlat = useMemo(() => json && flatKeys(json), [json])
  const [matches, setMatches] = React.useState<string[]>([])
  // console.log('keysFlat', keysFlat)
  const searchEmpty = search === ''
  useEffect(() => {
    if (search === '' && expanded?.length) {
      setExpanded([])
    }
  }, [searchEmpty])

  const miniSearch = useMemo(() => {
    if (!keysFlat?.length) return
    let miniSearch = new MiniSearch({
      fields: ['id', 'key'],
      storeFields: ['id', 'key'],
    })

    miniSearch.addAll(keysFlat)

    return miniSearch
  }, [keysFlat])

  const fuse = useMemo(() => {
    if (!keyTree?.length) return
    const options: Fuse.IFuseOptions<KeyTree> = {
      includeScore: true,
      includeMatches: true,
      findAllMatches: false,
      shouldSort: true,

      keys: [
        'name',
        'children.name',
        'children.children.name',
        'children.children.children.name',
        'children.children.children.children.name',
        'children.children.children.children.children.name',
        'children.children.children.children.children.children.name',
      ],
    }

    return new Fuse<KeyTree>(keyTree, options)
  }, [keyTree])

  useEffect(() => {
    if (!debouncedSearch || !keysFlat?.length || !miniSearch) return

    const results = miniSearch?.search(debouncedSearch)

    if (results?.length) {
      const top = results.slice(0, 5)
      setMatches(
        top
          .map((result) => result.id?.split('.')?.slice(-1)[0])
          .filter(Boolean),
      )
      const expanded: string[] = top.reduce((expanded, result) => {
        const { id, score } = result
        const parent = id.split('.').slice(0, -1)
        if (parent?.length) {
          if (parent.length === 1) {
            return [...expanded, parent[0]]
          }
          const next = parent.reduce((acc, curr) => {
            if (acc.length) {
              return [...acc, `${acc[acc.length - 1]}.${curr}`]
            }
            return [curr]
          }, [])
          return [...expanded, ...next]
        } else {
          return [...expanded, id]
        }
      }, [] as string[])

      const unique = [...new Set(expanded)]

      if (unique?.length) {
        setExpanded(unique)
      } else {
        setExpanded([])
      }
    } else {
      setMatches([])
    }
  }, [debouncedSearch, keysFlat])

  const searched = useMemo(() => {
    if (!debouncedSearch || !fuse || searchEmpty) return keyTree
    const results = fuse.search(debouncedSearch)
    console.log(results)
    return results
      .filter((result) => result.score < 0.1)
      .map((result) => result.item)
  }, [keyTree, debouncedSearch, searchEmpty])
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

  const isSearching = search && search !== debouncedSearch

  return (
    <div className='flex flex-col w-80 overflow-hidden'>
      <div className='p-4'>
        <TextField
          label='Search'
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          size='small'
          inputProps={{
            autoComplete: 'off',
            autoCorrect: 'off',
            autoCapitalize: 'off',
          }}
          fullWidth
          InputProps={{
            endAdornment: (
              <InputAdornment position='end' className={search ? '' : 'hidden'}>
                <IconButton size='small' onClick={() => setSearch('')}>
                  <Clear fontSize='small' />
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
      </div>
      <ContextMenu className='flex overflow-hidden'>
        {isSearching ? (
          <LinearProgress variant='query' className='w-full mx-4' />
        ) : (
          <TreeView
            aria-label='file system navigator'
            defaultCollapseIcon={<ExpandMoreIcon />}
            defaultExpandIcon={<ChevronRightIcon />}
            onNodeSelect={(e, nodeId) => setSelected(nodeId)}
            onNodeToggle={(e, nodeId) => setExpanded(nodeId)}
            expanded={expanded}
            sx={{ flexGrow: 1, overflowY: 'auto' }}
          >
            <RenderTree
              keyTree={searched}
              matches={matches}
              expanded={expanded}
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
}: {
  keyTree: KeyTree[]
  matches: string[]
  expanded: string[]
}) {
  return (
    <>
      {keyTree?.map((tree) => (
        <RenderTreeForm
          key={tree.id}
          nodes={tree}
          matches={matches}
          expanded={expanded}
        />
      )) || null}
    </>
  )
})
