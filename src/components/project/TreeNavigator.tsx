import React, { memo, useCallback } from 'react'

import ExpandMoreIcon from '@mui/icons-material/ExpandMore'

import { KeyTree } from '../../lib/keyTree'
import { IconButton, LinearProgress, Stack } from '@mui/material'

import { ShortText, WarningOutlined } from '@mui/icons-material'
import clsx from 'clsx'

import StaticBadge from '../shared/StaticBadge'
import TreeNavigatorToolbar from '../TreeNavigator/TreeNavigatorToolbar'
import { FixedSizeTree, FixedSizeNodeData } from 'react-vtree'

import {
  expandedAtom,
  getDirtyFieldsAtom,
  searchStringAtoms,
  getSelectedKeyAtom,
  setSelectedKeyAtom,
  toggleExpandedAtom,
  treeRef,
  getKeyTreeAtom,
  openContextMenuAtom,
} from '../../store/atoms'

import { useAtomValue } from 'jotai/react'

import { StoreType, _store } from '../app/ProjectContext'
import { useMeasureHeight } from '../../lib/hooks/useMeasureHeight'

const Node = ({
  data: node,
  isOpen,
  style,
}: {
  data: NodeData
  isOpen: boolean
  [key: string]: any
}) => {
  const { id, name, isLeaf, count, isDirty, isSelected, nestingLevel, score } =
    node

  const onClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isLeaf) {
      _store?.set(setSelectedKeyAtom, id)
    } else {
      const cascade = e.altKey
      _store?.set(toggleExpandedAtom, id, cascade)
    }
  }

  const onContextMenu = (event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    const data = {
      id,
      key: id.split('.').slice(-1)[0] || id,
      type: isLeaf ? 'value' : 'parent',
    }
    _store?.set(openContextMenuAtom, {
      mouseX: event.clientX + 2,
      mouseY: event.clientY - 6,
      data,
    })
  }
  return (
    <div style={style}>
      <Stack
        direction='row'
        alignItems='center'
        className={clsx(
          'w-full h-full pr-2 cursor-pointer hover:bg-gray-100',
          isSelected && 'font-bold bg-blue-100',
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
            score
              ? { backgroundColor: `rgba(0,255,0,${score / 100})` }
              : undefined
          }
          title={id}
        >
          {name}
        </span>
        <div className='flex-grow' />
        {count ? <StaticBadge badgeContent={count} color='primary' /> : null}
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
type GetStoreValue = StoreType['get']
const get: GetStoreValue = function (atom) {
  if (!_store) throw new Error('Store not initialized')
  return _store!.get(atom)
}
// This helper function constructs the object that will be sent back at the step
// [2] during the treeWalker function work. Except for the mandatory `data`
// field you can put any additional data here.
function getNodeData(
  node: KeyTree,
  nestingLevel: number,
  isDirty: boolean,
  isSelected: boolean,
  isOpenByDefault: boolean,
): GetNodeDataType {
  const isLeaf = !node?.children?.length
  // console.log('getNodeData')
  return {
    data: {
      id: node.id,
      isOpenByDefault, // mandatory
      name: node.name,
      isLeaf,
      nestingLevel,
      isSelected,
      isDirty,
      count: node?.children?.length,
    },
    nestingLevel,
    node,
  }
}
export default function TreeNavigator() {
  const isSearching = useAtomValue(searchStringAtoms.isDebouncingAtom)
  const keyTree = useAtomValue(getKeyTreeAtom)
  const [scrollContainerRef, treeHeight] = useMeasureHeight<HTMLDivElement>()

  const loading = isSearching || !keyTree.length

  const treeWalker = useCallback(
    function* treeWalker() {
      const dirtyFields = get(getDirtyFieldsAtom)
      const selectedKey = get(getSelectedKeyAtom)
      const expanded = get(expandedAtom)
      // Step [1]: Define the root node of our tree. There can be one or
      // multiple nodes.
      for (let i = 0; i < keyTree.length; i++) {
        const nodeId = keyTree[i].id
        yield getNodeData(
          keyTree[i],
          0,
          dirtyFields.includes(nodeId),
          selectedKey === nodeId,
          expanded.includes(nodeId),
        )
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
          const childId = parent.node.children![i].id
          yield getNodeData(
            parent.node.children![i],
            parent.nestingLevel + 1,
            dirtyFields.includes(childId),
            selectedKey === childId,
            expanded.includes(childId),
          )
        }
      }
    },
    [keyTree],
  )

  return (
    <div className='flex  flex-col w-80 pt-4 bg-gray-50'>
      <TreeNavigatorToolbar />
      <div className='flex-1 select-none' ref={scrollContainerRef}>
        {loading ? (
          <LinearProgress variant='query' className='h-1' />
        ) : (
          <TreeWalkerTree height={treeHeight} treeWalker={treeWalker} />
        )}
      </div>
    </div>
  )
}

const TreeWalkerTree = memo(function TreeWalkerTree({
  height,
  treeWalker,
}: {
  height: number
  treeWalker: () => Generator<
    GetNodeDataType | undefined,
    never,
    GetNodeDataType
  >
}) {
  return (
    <FixedSizeTree
      ref={treeRef}
      treeWalker={treeWalker}
      itemSize={36}
      // overscanCount={10}
      height={height}
      width='100%'
      // rowComponent={Row}
    >
      {Node}
    </FixedSizeTree>
  )
})
