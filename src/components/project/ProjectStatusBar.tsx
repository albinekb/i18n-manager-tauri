import {
  Avatar,
  Badge,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemSecondaryAction,
  ListItemText,
  Popover,
  Stack,
  Toolbar,
  Typography,
} from '@mui/material'
import React, { useCallback, useEffect, useMemo } from 'react'
import { useFormContext, useFormState } from 'react-hook-form'
import traverse from 'traverse'
import useSaveProject from './hooks/useSaveProject'
import { useAtom, useAtomValue, useSetAtom } from 'jotai/react'
import {
  addedAtom,
  projectLanguagesAtom,
  getSelectedKeyAtom,
  setSelectedKeyAtom,
  isSavingProjectAtom,
  restoreDeletedFieldAtom,
  deletedKeysAtom,
  getDeletedMapAtom,
  projectLanguageTreeAtom,
  resetProjectChangesAtom,
} from '../../store/atoms'
import { _store } from '../app/ProjectContext'
import { Unarchive as UndoIcon } from '@mui/icons-material'
import { usePopFromAtom } from '../../lib/atoms/hooks/usePopFromAtom'
type Props = {}

function useDirtyWarning(isDirty: boolean) {
  useEffect(() => {
    if (!isDirty) return
    let aborted = false
    const listener = Promise.all([
      import('@tauri-apps/api/window'),
      import('@tauri-apps/api/dialog'),
    ]).then(([{ appWindow }, { confirm }]) => {
      if (aborted) return
      return appWindow.onCloseRequested(async (event) => {
        console.log(`Got error in window ${event.windowLabel}`)
        const confirmed = await confirm('Are you sure?')
        if (!confirmed) {
          // user did not confirm closing the window; let's prevent it
          event.preventDefault()
        }
      })
    })

    return () => {
      aborted = true
      listener.then((unlisten) => unlisten?.())
    }
  }, [isDirty])
}

export default function ProjectStatusBar({}: Props) {
  const added = useAtomValue(addedAtom)
  const deleted = useAtomValue(deletedKeysAtom)
  const isSaving = useAtomValue(isSavingProjectAtom)

  const { isDirty } = useFormState()

  useDirtyWarning(isDirty)

  const addedKeys = added.length
  const deletedKeys = deleted.length

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
          <Stack direction='row' gap={1} alignItems='center'>
            <SaveButton isSaving={isSaving} />
            <ResetButton disabled={isSaving} />
          </Stack>
        )}
        <Stack direction='row' gap={1}>
          {addedKeys > 0 ? (
            <Chip
              avatar={
                <Avatar
                  sx={{
                    bgcolor: 'success.main',
                  }}
                  className='text-white'
                >
                  {addedKeys}
                </Avatar>
              }
              label='Added keys'
            />
          ) : null}
          {deletedKeys > 0 ? <DeletedKeysList /> : null}
          {isDirty && <DirtyLists />}
        </Stack>
      </Stack>
    </Toolbar>
  )
}

function DeletedKeysList() {
  const deleted = useAtomValue(deletedKeysAtom)
  const selected = useAtomValue(getSelectedKeyAtom)
  const selectKey = useSetAtom(setSelectedKeyAtom)
  const [anchorEl, setAnchorEl] = React.useState<Element | null>(null)
  const handleOpen = useCallback((e) => setAnchorEl(e.currentTarget), [])
  const handleClose = useCallback(() => setAnchorEl(null), [])
  const open = Boolean(anchorEl)

  const count = deleted?.length
  if (!count || count === 0) {
    return null
  }

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
          {deleted.map((id) => {
            return (
              <ListItem
                key={id}
                secondaryAction={
                  <IconButton
                    size='small'
                    edge='end'
                    aria-label='undo'
                    onClick={() => {
                      _store?.set(restoreDeletedFieldAtom, id)
                      handleClose()
                    }}
                  >
                    <UndoIcon />
                  </IconButton>
                }
              >
                <ListItemText primary={id} />
              </ListItem>
            )
          })}
        </List>
      </Popover>

      <Chip
        onClick={handleOpen}
        disabled={!count}
        avatar={
          <Avatar
            sx={{
              bgcolor: 'error.main',
            }}
            className='text-white'
          >
            {count}
          </Avatar>
        }
        label='Deleted keys'
      />
    </>
  )
}

function DirtyLists() {
  const deleted = useAtomValue(getDeletedMapAtom)
  const languages = useAtomValue(projectLanguagesAtom)
  const { isDirty, dirtyFields: formStateDirtyFields } = useFormState()

  useDirtyWarning(isDirty)
  const [dirtyFields, dirtyKeys] = useMemo(
    (): [Set<string>, Set<string>] =>
      traverse(formStateDirtyFields).reduce(
        function ([fields, keys]: [Set<string>, Set<string>], val: any) {
          if (deleted.has(this.path.join('.'))) {
            return [fields, keys]
          }
          if (
            !this.isLeaf &&
            typeof val === 'object' &&
            languages.some((lang) => val[lang] === true)
          ) {
            keys.add(this.path.join('.'))
          }

          if (this.isLeaf && val === true) {
            fields.add(this.path.join('.'))
          }

          return [fields, keys]
        },
        [new Set(), new Set()],
      ),
    [formStateDirtyFields, languages],
  )

  return (
    <>
      <DirtyList
        count={dirtyFields.size}
        keys={dirtyFields}
        label='Dirty fields'
        getKey={(node) => node.split('.').slice(0, -1).join('.')}
      />

      <DirtyList count={dirtyKeys.size} keys={dirtyKeys} label='Dirty keys' />
    </>
  )
}

function SaveButton({ isSaving }: { isSaving: boolean }) {
  const saveProject = useSaveProject()
  return useMemo(
    () => (
      <Button
        onClick={saveProject}
        disabled={isSaving}
        endIcon={isSaving && <CircularProgress size={16} />}
        variant='contained'
        size='small'
      >
        Save
      </Button>
    ),
    [isSaving, saveProject],
  )
}

function ResetButton({ disabled }: { disabled: boolean }) {
  const { reset } = useFormContext()
  return useMemo(
    () => (
      <Button
        onClick={() => {
          reset(_store?.get(projectLanguageTreeAtom), { keepDirty: false })
          _store?.set(resetProjectChangesAtom)
        }}
        disabled={disabled}
        color='error'
        size='small'
        variant='outlined'
      >
        Reset
      </Button>
    ),
    [disabled, reset],
  )
}

function DirtyList({
  count,
  label,
  keys,
  getKey,
}: {
  count: number
  label: string
  keys: Set<string>
  getKey?: (node: string) => string
}) {
  const selected = useAtomValue(getSelectedKeyAtom)
  const selectKey = useSetAtom(setSelectedKeyAtom)
  const [anchorEl, setAnchorEl] = React.useState<Element | null>(null)
  const handleOpen = useCallback((e) => setAnchorEl(e.currentTarget), [])
  const handleClose = useCallback(() => setAnchorEl(null), [])
  const open = Boolean(anchorEl)
  const fields = useMemo(() => {
    return Array.from(keys)
  }, [open])
  if (keys.size === 0 || count === 0) {
    return null
  }
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
          {fields.map((field) => {
            const key = getKey ? getKey(field) : field
            return (
              <ListItemButton
                selected={selected === key}
                onClick={() => {
                  selectKey(key)
                  handleClose()
                }}
                key={field}
              >
                {field}
              </ListItemButton>
            )
          })}
        </List>
      </Popover>
      <Chip
        onClick={handleOpen}
        disabled={!keys.size}
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
