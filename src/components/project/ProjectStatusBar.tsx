import {
  Avatar,
  Badge,
  Button,
  Chip,
  CircularProgress,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  Popover,
  Stack,
  Toolbar,
  Typography,
} from '@mui/material'
import React, { useCallback, useEffect, useMemo } from 'react'
import { useFormContext, useFormState } from 'react-hook-form'
import traverse from 'traverse'
import { selectKey, useProjectContext } from '../app/ProjectContext'
import flatten from 'flat'
import dotProp from 'dot-prop'
import { writeFile } from '@tauri-apps/api/fs'
import { join as pathJoin } from 'path'
import useSaveProject from './hooks/useSaveProject'
import { listen, TauriEvent } from '@tauri-apps/api/event'
import { appWindow } from '@tauri-apps/api/window'
import { confirm } from '@tauri-apps/api/dialog'
type Props = {}

export default function ProjectStatusBar({}: Props) {
  const projectContext = useProjectContext()
  const { isDirty } = useFormState()
  const { formState, getValues } = useFormContext()
  const { saveProject, isSaving } = useSaveProject()
  const languages = projectContext.project.languages
  useEffect(() => {
    const listener = appWindow.onCloseRequested(async (event) => {
      console.log(
        `Got error in window ${event.windowLabel}, payload: ${event.payload}`,
      )
      if (!isDirty) return
      const confirmed = await confirm('Are you sure?')
      if (!confirmed) {
        // user did not confirm closing the window; let's prevent it
        event.preventDefault()
      }
    })

    return () => {
      listener.then((unlisten) => unlisten())
    }
  }, [isDirty])

  const [dirtyFields, dirtyKeys] = useMemo(
    () =>
      traverse(formState.dirtyFields).reduce(
        function ([fields, keys]: [number, Set<string>], val) {
          if (this.isLeaf && val === true) fields++
          if (
            !this.isLeaf &&
            typeof val === 'object' &&
            languages.some((lang) => val[lang] === true)
          ) {
            keys.add(this.path.join('.'))
          }

          return [fields, keys]
        },
        [0, new Set()],
      ),
    // .map((val) => val?.size || val || 0),
    [formState, languages],
  )

  return (
    <Toolbar
      variant='dense'
      className='w-full bg-gray-200 border-t border-gray-300'
    >
      <Stack
        direction='row'
        alignItems='center'
        justifyContent='space-between'
        spacing={2}
        width='100%'
      >
        <Typography variant='subtitle2'>
          {isDirty ? 'dirty' : 'clean'}
        </Typography>
        {isDirty && (
          <Button
            onClick={saveProject}
            disabled={isSaving}
            endIcon={isSaving && <CircularProgress size={16} />}
          >
            Save
          </Button>
        )}
        <Stack direction='row' gap={1}>
          <Chip
            avatar={
              <Avatar
                sx={{
                  bgcolor: isDirty ? 'warning.main' : 'success.main',
                }}
                className='text-white'
              >
                {dirtyFields}
              </Avatar>
            }
            label='Dirty fields'
          />

          <DirtyList
            count={dirtyKeys.size}
            keys={dirtyKeys}
            label='Dirty keys'
            setSelected={projectContext.setSelected}
          />
        </Stack>
      </Stack>
    </Toolbar>
  )
}

function DirtyList({
  count,
  label,
  keys,
  setSelected,
}: {
  count: number
  label: string
  keys: Set<string>
  setSelected: (selected: string) => void
}) {
  const form = useFormContext()
  const projectContext = useProjectContext()
  const [anchorEl, setAnchorEl] = React.useState<Element | null>(null)
  const handleOpen = useCallback((e) => setAnchorEl(e.currentTarget), [])
  const handleClose = useCallback(() => setAnchorEl(null), [])
  const open = Boolean(anchorEl)
  const fields = useMemo(() => {
    if (open) {
      return Array.from(keys)
    }

    return []
  }, [open])
  return (
    <>
      <Popover
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
      >
        <List>
          {fields.map((field) => (
            <ListItemButton
              onClick={() => {
                selectKey(projectContext, field)
                handleClose()
              }}
              key={field}
            >
              {field}
            </ListItemButton>
          ))}
        </List>
      </Popover>
      <Chip
        onClick={handleOpen}
        avatar={
          <Avatar
            sx={{
              bgcolor: count ? 'warning.main' : 'success.main',
            }}
            className='text-white'
          >
            {count}
          </Avatar>
        }
        label={label}
      />
    </>
  )
}
