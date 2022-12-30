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
import useSaveProject from './hooks/useSaveProject'
import { appWindow } from '@tauri-apps/api/window'
import { confirm } from '@tauri-apps/api/dialog'
import { useAtom, useAtomValue, useSetAtom } from 'jotai/react'
import {
  addedAtom,
  deletedAtom,
  projectLanguagesAtom,
  selectedKeyAtom,
  selectKeyAtom,
} from '../app/atoms'
type Props = {}

export default function ProjectStatusBar({}: Props) {
  const languages = useAtomValue(projectLanguagesAtom)

  const [deleted, setDeleted] = useAtom(deletedAtom)
  const [added, setAdded] = useAtom(addedAtom)

  const { isDirty } = useFormState()
  const { formState, reset: resetForm } = useFormContext()
  const { saveProject, isSaving } = useSaveProject()

  useEffect(() => {
    const listener = appWindow.onCloseRequested(async (event) => {
      console.log(`Got error in window ${event.windowLabel}`)
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

  const [dirtyFields, dirtyKeys, addedKeys, deletedKeys] = useMemo(
    () =>
      traverse(formState.dirtyFields).reduce(
        function (
          [fields, keys, addedCount, deletedCount]: [
            Set<string>,
            Set<string>,
            number,
            number,
          ],
          val: any,
        ) {
          if (deleted.includes(this.path.join('.'))) {
            return [fields, keys, addedCount, deletedCount]
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

          return [fields, keys, addedCount, deletedCount]
        },
        [new Set(), new Set(), added.length, deleted.length],
      ),
    // .map((val) => val?.size || val || 0),
    [formState, languages, added, deleted],
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
          <Stack direction='row' gap={1} alignItems='center'>
            <Button
              onClick={saveProject}
              disabled={isSaving}
              endIcon={isSaving && <CircularProgress size={16} />}
              variant='contained'
              size='small'
            >
              Save
            </Button>
            <Button
              onClick={() => {
                setAdded([])
                setDeleted([])
                resetForm()
              }}
              disabled={isSaving}
              color='error'
              size='small'
              variant='outlined'
            >
              Reset
            </Button>
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
          {deletedKeys > 0 ? (
            <Chip
              avatar={
                <Avatar
                  sx={{
                    bgcolor: 'error.main',
                  }}
                  className='text-white'
                >
                  {deletedKeys}
                </Avatar>
              }
              label='Deleted keys'
            />
          ) : null}
          <DirtyList
            count={dirtyFields.size}
            keys={dirtyFields}
            label='Dirty fields'
            getKey={(node) => node.split('.').slice(0, -1).join('.')}
          />

          <DirtyList
            count={dirtyKeys.size}
            keys={dirtyKeys}
            label='Dirty keys'
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
  getKey,
}: {
  count: number
  label: string
  keys: Set<string>
  getKey?: (node: string) => string
}) {
  const selected = useAtomValue(selectedKeyAtom)
  const selectKey = useSetAtom(selectKeyAtom)
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
