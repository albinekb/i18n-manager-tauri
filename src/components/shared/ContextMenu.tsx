import * as React from 'react'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Typography from '@mui/material/Typography'
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormLabel,
  ListItemIcon,
  ListSubheader,
  Paper,
  Radio,
  RadioGroup,
  Stack,
  TextField,
} from '@mui/material'
import {
  AddCircleOutline,
  ContentCopy,
  ContentCut,
  DeleteForever,
} from '@mui/icons-material'
import { useFormContext } from 'react-hook-form'
import { selectKey, useProjectContext } from '../app/ProjectContext'

const getData = (
  target,
  lives = 5,
): {
  id: string
  type: string
  key: string
} | null => {
  if (!target || !target.getAttribute) return null
  const dataId = target.getAttribute('data-id')
  if (dataId) {
    return {
      id: dataId,
      key: dataId.split('.').slice(-1)[0] || dataId,
      type: target.getAttribute('data-type'),
    }
  }
  if (lives === 0) {
    return null
  }
  return getData(target.parentNode, lives - 1)
}

export function ContextMenu({
  children,
  className,
  style,
}: {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
}) {
  const projectContext = useProjectContext()
  const formContext = useFormContext()
  const [dialog, setDialog] = React.useState<any>(null)
  const [contextMenu, setContextMenu] = React.useState<{
    mouseX: number
    mouseY: number
    data: any
  } | null>(null)

  const handleContextMenu = React.useCallback((event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    if (contextMenu !== null) {
      setContextMenu(null)
      return
    }
    const data = getData(event.target as HTMLElement)
    if (!data) return
    selectKey(projectContext, data.id)
    setContextMenu({
      mouseX: event.clientX + 2,
      mouseY: event.clientY - 6,
      data,
    })
  }, [])

  const handleClose = React.useCallback(() => {
    setContextMenu(null)
  }, [])
  const closeDialog = React.useCallback(() => {
    setDialog(null)
  }, [])

  const handleNew = React.useCallback(() => {
    console.log('new', contextMenu?.data)
    const data = { ...contextMenu?.data }
    handleClose()
    setDialog({
      data,
      action: 'new',
    })
  }, [contextMenu?.data])

  const { resetField, setValue } = formContext
  const dataId = contextMenu?.data?.id || dialog?.data?.id
  console.log('dataId', dataId)
  const handleDelete = React.useCallback(() => {
    resetField(dataId, {
      defaultValue: undefined,
    })
    setValue(dataId, undefined, {
      shouldDirty: true,
    })
    projectContext.setDeleted((edits) => [...edits, dataId])

    handleClose()
  }, [dataId])

  const submit = React.useCallback(
    ({ id: dataId, type, value }) => {
      if (!dataId) throw new Error('No data id')
      const name = `${dataId}.${value}`
      if (type === 'value') {
        setValue(
          name,
          projectContext.project.languages.reduce((acc, lang) => {
            acc[lang] = ''
            return acc
          }, {}),
        )
        projectContext.setAdded((edits) => [...edits, name])
        selectKey(projectContext, name)
        closeDialog()
      } else {
        setValue(name, {})
        projectContext.setAdded((edits) => [...edits, name])
        selectKey(projectContext, name)
        closeDialog()
      }
    },
    [projectContext.project.languages],
  )

  return (
    <div
      onContextMenu={handleContextMenu}
      style={{ cursor: 'context-menu', ...style }}
      className={className}
    >
      {dialog && (
        <ContextDialog
          {...dialog}
          onClose={() => setDialog(null)}
          onSubmit={submit}
        />
      )}
      <Menu
        open={contextMenu !== null}
        onClose={handleClose}
        anchorReference='anchorPosition'
        anchorPosition={
          contextMenu !== null
            ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
            : undefined
        }
        MenuListProps={{
          subheader: <ListSubheader>{contextMenu?.data?.key}</ListSubheader>,
        }}
      >
        <MenuItem
          onClick={handleNew}
          disabled={contextMenu?.data?.type !== 'parent'}
        >
          <ListItemIcon>
            <AddCircleOutline fontSize='small' />
          </ListItemIcon>
          New
        </MenuItem>
        <MenuItem onClick={handleClose}>
          <ListItemIcon>
            <ContentCopy fontSize='small' />
          </ListItemIcon>
          Copy
        </MenuItem>
        <MenuItem onClick={handleClose}>
          <ListItemIcon>
            <ContentCut fontSize='small' />
          </ListItemIcon>
          Cut
        </MenuItem>
        <MenuItem onClick={handleDelete}>
          <ListItemIcon>
            <DeleteForever fontSize='small' />
          </ListItemIcon>
          Delete
        </MenuItem>
      </Menu>
      {children}
    </div>
  )
}

function ContextDialog({ data, onClose, onSubmit }) {
  const [type, setType] = React.useState('value')
  const [value, setValue] = React.useState('')

  const onFormSubmit = React.useCallback(
    (event) => {
      event.preventDefault()
      onSubmit({ type, value, id: data?.key })
    },
    [onSubmit, type, value, data?.key],
  )

  const handleChangeValue = React.useCallback(
    (event) => {
      setValue(event.target.value)
    },
    [setValue],
  )

  const handleChangeType = React.useCallback(
    (event) => {
      setType(event.target.value)
    },
    [setType],
  )

  return (
    <Dialog
      open={true}
      onClose={onClose}
      disableAutoFocus
      disableEnforceFocus
      disableRestoreFocus
      PaperComponent={(props) => (
        <Paper
          component={(props) => <form onSubmit={onFormSubmit} {...props} />}
          elevation={24}
          {...props}
        />
      )}
    >
      <DialogTitle>{data?.key}</DialogTitle>
      <DialogContent>
        <div className='flex flex-col flex-1 '>
          <FormControl>
            <FormLabel>Type</FormLabel>
            <RadioGroup value={type} onChange={handleChangeType}>
              <Stack direction='row'>
                <FormControlLabel
                  value='value'
                  control={<Radio />}
                  label='value'
                />
                <FormControlLabel
                  value='node'
                  control={<Radio />}
                  label='node'
                />
              </Stack>
            </RadioGroup>
          </FormControl>
          <TextField
            label='key'
            autoFocus
            value={value}
            focused
            onChange={handleChangeValue}
            autoComplete='off'
            autoCapitalize='off'
            autoCorrect='off'
          />
        </div>
      </DialogContent>
      <DialogActions>
        <Button disabled={!value} type='submit'>
          Create
        </Button>
        <Button onClick={onClose} color='secondary'>
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  )
}
