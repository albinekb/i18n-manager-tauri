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
  Stack,
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
import { Clear, WarningOutlined } from '@mui/icons-material'
import clsx from 'clsx'

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

  return (
    <TreeItem
      key={nodes.id}
      nodeId={nodes.id}
      label={
        <Stack
          direction='row'
          alignItems='center'
          justifyContent='space-between'
        >
          <span className={clsx(isDirty && 'font-semibold')}>{nodes.name}</span>
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
      endIcon={isParent && <ExpandMoreIcon />}
      className={clsx(isSelected && 'bg-gray-100')}
    >
      {Array.isArray(nodes.children)
        ? nodes.children.map((node) => (
            <RenderTreeForm
              key={node.id}
              nodes={node}
              matches={matches}
              expanded={expanded}
              selected={selected}
            />
          ))
        : null}
    </TreeItem>
  )
}
const flatKeys = (tree: KeyTree[]) => {
  return Object.entries(flatten(tree, { delimiter: '.' })).map(
    ([id, value]) => ({ id, value, key: id?.split('.')?.slice(-1)[0] || id }),
  )
}

export default function TreeNavigator({}: Props) {
  const { project, setSelected, selected, expanded, setExpanded } =
    useProjectContext()
  const keyTree = useKeyTree(project)

  const [search, setSearch] = React.useState<string>('')
  const debouncedSearch = useDebounce(search, 500)
  const json = project?.data?.[project?.files?.[0]]
  const keysFlat = useMemo(() => json && flatKeys(json), [json])
  const [matches, setMatches] = React.useState<string[]>([])
  // console.log('keysFlat', keysFlat)
  const searchEmpty = search === ''
  useEffect(() => {
    if (search === '' && expanded?.length && !selected) {
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
      }
    } else {
      setMatches([])
    }
  }, [debouncedSearch, keysFlat])
  console.log('selected', selected)
  useEffect(() => {
    if (selected) {
      const nodes = selected.split('.')
      if (!nodes?.length) {
        return
      }
      if (expanded.includes(nodes.slice(0, -1).join('.'))) {
        document
          .querySelector(`[data-id="${selected}"]`)

          ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        return
      }
      if (nodes.length === 1) {
        setExpanded((prev) => [...new Set([...prev, selected])])
      } else {
        const next = nodes.reduce((acc, curr) => {
          if (acc.length) {
            return [...acc, `${acc[acc.length - 1]}.${curr}`]
          }
          return [curr]
        }, [])
        setExpanded((prev) => [...new Set([...prev, ...next])])
        document
          .querySelector(`[data-id="${selected}"]`)
          ?.scrollIntoView({ behavior: 'smooth' })
      }
    }
  }, [selected])

  const searched = useMemo(() => {
    if (!debouncedSearch || !fuse || searchEmpty) return keyTree
    const results = fuse.search(debouncedSearch)

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
