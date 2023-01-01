import React, {
  memo,
  ReactElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from 'react'

import ExpandMoreIcon from '@mui/icons-material/ExpandMore'

import { KeyTree } from '../../lib/keyTree'
import { IconButton, LinearProgress, Stack } from '@mui/material'
import { useFormContext } from 'react-hook-form'

import { ShortText, WarningOutlined } from '@mui/icons-material'
import clsx from 'clsx'
import traverse from 'traverse'

import StaticBadge from '../shared/StaticBadge'
import TreeNavigatorToolbar from '../TreeNavigator/TreeNavigatorToolbar'
import { FixedSizeTree, TreeWalker, FixedSizeNodeData } from 'react-vtree'

import AutoSizer from 'react-virtualized-auto-sizer'

import {
  expandedAtom,
  getDirtyFieldsAtom,
  keyTreeAtom,
  searchStringAtoms,
  getSelectedKeyAtom,
  setSelectedKeyAtom,
  setDirtyFieldsAtom,
  toggleExpandedAtom,
  treeRef,
  contextMenuAtom,
  getKeyTreeAtom,
} from '../../store/atoms'

import { useAtomValue } from 'jotai/react'

import { _store } from '../app/ProjectContext'

type Props = {}

const Node = ({
  data: node,
  isOpen,
  style,
}: {
  data: NodeData
  isOpen: boolean
  [key: string]: any
}) => {
  const {
    id,
    name,
    isLeaf,
    isParent,
    count,
    isDirty,
    isSelected,
    nestingLevel,
  } = node

  const onClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      if (isLeaf) {
        _store?.set(setSelectedKeyAtom, id)
      } else {
        const cascade = e.altKey
        _store?.set(toggleExpandedAtom, id, cascade)
      }
    },
    [id, isLeaf],
  )

  const onContextMenu = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault()
      event.stopPropagation()
      const data = {
        id,
        key: id.split('.').slice(-1)[0] || id,
        type: isLeaf ? 'value' : 'parent',
      }
      _store?.set(contextMenuAtom, {
        mouseX: event.clientX + 2,
        mouseY: event.clientY - 6,
        data,
      })
    },
    [id, isLeaf],
  )
  return (
    <div style={style}>
      <Stack
        direction='row'
        alignItems='center'
        className={clsx(
          'w-full h-full pr-2',
          isSelected && 'font-bold bg-blue-100',
          'hover:bg-gray-100',
          'cursor-pointer',
        )}
        style={{
          paddingLeft: (nestingLevel || 0) * 18,
        }}
        onClick={onClick}
        onContextMenu={onContextMenu}
      >
        {isLeaf ? (
          <IconButton size='small' disabled title='Value'>
            <ShortText style={{ width: 20, height: 20 }} />
          </IconButton>
        ) : (
          <IconButton
            size='small'
            onClick={onClick}
            title={isOpen ? 'Collapse (⌥ to cascade)' : 'Expand (⌥ to cascade)'}
          >
            <ExpandMoreIcon
              style={{ width: 20, height: 20 }}
              className={clsx(
                'transform transition-transform duration-300',
                isOpen && 'rotate-180',
              )}
            />
          </IconButton>
        )}

        <span
          className={clsx(isDirty && 'font-semibold', 'font-weight-[inherit]')}
          style={
            node?.score
              ? { backgroundColor: `rgba(0,255,0,${node.score / 100})` }
              : undefined
          }
          title={id}
        >
          {node.name}
        </span>
        <div className='flex-grow' />
        {count && <StaticBadge badgeContent={count} color='primary' />}
        {isDirty && <WarningOutlined fontSize='small' />}
      </Stack>
    </div>
  )
}
export type NodeData = FixedSizeNodeData &
  Partial<{
    name: string
    isLeaf: boolean
    nestingLevel: number
    isParent: boolean
    isSelected: boolean
    isDirty: boolean
    count?: number
    score?: number
  }>

// const Row = ({
//   index,
//   data: { component: Node, getRecordData, treeData },
//   style,
//   isScrolling,
// }: PropsWithChildren<
//   TypedListChildComponentProps<NodeData, NodePublicState<NodeData>>
// >): ReactElement | null => {
//   const data = getRecordData(index)

//   return (
//     <Node
//       isScrolling={isScrolling}
//       style={style}
//       treeData={treeData}
//       {...data}
//     />
//   )
// }

type GetNodeDataType = { data: NodeData; nestingLevel: number; node: KeyTree }

// This helper function constructs the object that will be sent back at the step
// [2] during the treeWalker function work. Except for the mandatory `data`
// field you can put any additional data here.
function getNodeData(node: KeyTree, nestingLevel): GetNodeDataType {
  const isLeaf = !node?.children?.length
  const isDirty = _store?.get(getDirtyFieldsAtom)?.includes(node.id)
  const isSelected = _store?.get(getSelectedKeyAtom) === node.id
  console.log('getNodeData')

  return {
    data: {
      id: node.id,
      isOpenByDefault: _store?.get(expandedAtom)?.includes(node.id) || false, // mandatory
      name: node.name,
      isLeaf,
      nestingLevel,
      isParent: !!node?.children?.length,
      isSelected,
      isDirty,
      count: node?.children?.length,
    },
    nestingLevel,
    node,
  }
}
export default function TreeNavigator({}: Props) {
  const isSearching = useAtomValue(searchStringAtoms.isDebouncingAtom)

  const keyTree = useAtomValue(getKeyTreeAtom)

  return (
    <div className='flex h-full  flex-col w-80 pt-4 bg-gray-50'>
      <TreeNavigatorToolbar />
      <div className='flex-1'>
        <AutoSizer>
          {({ height, width }) =>
            isSearching || !keyTree.length ? (
              <LinearProgress
                style={{ width }}
                variant='query'
                className='h-1'
              />
            ) : (
              <TreeWalkerTree width={width} height={height} keyTree={keyTree} />
            )
          }
        </AutoSizer>
      </div>
    </div>
  )
}

const TreeWalkerTree = memo(function TreeWalkerTree({
  width,
  height,
  keyTree,
}: {
  width: number
  height: number
  keyTree: KeyTree[]
}) {
  const treeWalker = useCallback(function* treeWalker() {
    // Step [1]: Define the root node of our tree. There can be one or
    // multiple nodes.
    for (let i = 0; i < keyTree.length; i++) {
      yield getNodeData(keyTree[i], 0)
    }

    while (true) {
      // Step [2]: Get the parent component back. It will be the object
      // the `getNodeData` function constructed, so you can read any data from it.
      const parent: GetNodeDataType = yield
      const children = parent?.node?.children || []
      const childrenCount = children.length
      for (let i = 0; i < childrenCount; i++) {
        // Step [3]: Yielding all the children of the provided component. Then we
        // will return for the step [2] with the first children.

        yield getNodeData(parent.node.children![i], parent.nestingLevel + 1)
      }
    }
  }, [])

  return (
    <FixedSizeTree
      ref={treeRef}
      treeWalker={treeWalker}
      itemSize={36}
      // overscanCount={100}
      height={height}
      width={width}
      // rowComponent={Row}
    >
      {Node}
    </FixedSizeTree>
  )
})
