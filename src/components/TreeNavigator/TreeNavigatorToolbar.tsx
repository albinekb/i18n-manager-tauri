import {
  Clear,
  InfoOutlined,
  SearchTwoTone,
  UnfoldLess,
  UnfoldMore,
} from '@mui/icons-material'
import { TreeItem, TreeView } from '@mui/lab'
import {
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Toolbar,
  Tooltip,
} from '@mui/material'
import { useAtom, useAtomValue, useSetAtom } from 'jotai/react'
import React, { useCallback } from 'react'
import {
  expandedAtom,
  foldAllAtom,
  hasExpandedAtom,
  projectInfoAtom,
  projectLanguageTreeAtom,
  searchStringAtoms,
  unfoldAllAtom,
} from '../../store/atoms'

type Props = {}

export default function TreeNavigatorToolbar({}: Props) {
  const projectInfo = useAtomValue(projectInfoAtom)
  if (!projectInfo) return null
  return (
    <Stack direction='column'>
      <div className='px-4 pb-4'>
        <Search />
      </div>

      <TreeView
        onNodeSelect={() => {}}
        onNodeToggle={() => {}}
        expanded={[]}
        selected={[]}
      >
        <TreeItem
          nodeId='root'
          label={
            <Stack
              direction='row'
              alignItems='center'
              justifyContent='space-between'
              title={projectInfo.projectPath}
            >
              {projectInfo.projectName}
            </Stack>
          }
          expandIcon={<FoldButton />}
          classes={{
            content: 'cursor-default hover:bg-transparent',
            focused: 'bg-transparent',
          }}
        >
          <TreeItem nodeId='children' label='children' />
        </TreeItem>
      </TreeView>
    </Stack>
  )
}

function Search() {
  const setSearchString = useSetAtom(searchStringAtoms.debouncedValueAtom)
  const searchString = useAtomValue(searchStringAtoms.currentValueAtom)

  return (
    <TextField
      value={searchString}
      placeholder='Search'
      onChange={(e) => setSearchString(e.target.value)}
      inputProps={{
        autoComplete: 'off',
        autoCorrect: 'off',
        autoCapitalize: 'off',
      }}
      fullWidth
      InputProps={{
        startAdornment: (
          <InputAdornment position='start'>
            <SearchTwoTone />
          </InputAdornment>
        ),
        endAdornment: (
          <InputAdornment
            position='end'
            className={searchString ? '' : 'hidden'}
          >
            <IconButton size='small' onClick={() => setSearchString('')}>
              <Clear fontSize='small' />
            </IconButton>
          </InputAdornment>
        ),
      }}
    />
  )
}

function FoldButton() {
  const unfoldAll = useSetAtom(unfoldAllAtom)
  const foldAll = useSetAtom(foldAllAtom)
  const hasExpanded = useAtomValue(hasExpandedAtom)
  const foldIcon = hasExpanded ? <UnfoldLess /> : <UnfoldMore />
  return (
    <div className='text-black'>
      <IconButton
        size='small'
        color='inherit'
        onClick={hasExpanded ? foldAll : unfoldAll}
      >
        {foldIcon}
      </IconButton>
    </div>
  )
}
