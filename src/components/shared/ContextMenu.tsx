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

  const handleContextMenu = (event: React.MouseEvent) => {
    event.preventDefault()
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
  }

  const handleClose = () => {
    setContextMenu(null)
  }

  const handleNew = () => {
    console.log('new', contextMenu?.data)
    handleClose()
    setDialog({
      data: contextMenu?.data,
      action: 'new',
    })
  }

  const handleDelete = () => {
    formContext.setValue(contextMenu?.data?.id, undefined)
    projectContext.setAdded((edits) =>
      edits.includes(contextMenu?.data?.id)
        ? edits.filter((edit) => edit !== contextMenu?.data?.id)
        : [...edits, contextMenu?.data?.id],
    )

    handleClose()
  }

  return (
    <div
      onContextMenu={handleContextMenu}
      style={{ cursor: 'context-menu', ...style }}
      className={className}
    >
      {dialog && <ContextDialog {...dialog} onClose={() => setDialog(null)} />}
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

function ContextDialog({ data, action, onClose }) {
  const [type, setType] = React.useState('value')
  const [value, setValue] = React.useState('')
  const form = useFormContext()
  const projectContext = useProjectContext()

  const submit = () => {
    const name = `${data.id}.${value}`
    if (type === 'value') {
      form.setValue(
        name,
        projectContext.project.languages.reduce((acc, lang) => {
          acc[lang] = ''
          return acc
        }, {}),
      )
      projectContext.setAdded((edits) => [...edits, name])
      selectKey(projectContext, name)
      onClose()
    } else {
      form.setValue(name, {})
      projectContext.setAdded((edits) => [...edits, name])
      selectKey(projectContext, name)
      onClose()
    }
  }

  return (
    <Dialog
      open={true}
      onClose={onClose}
      // disableAutoFocus
      // disableEnforceFocus
      disableRestoreFocus
      PaperComponent={(props) => (
        <Paper
          component='form'
          onSubmit={(event) => {
            event.preventDefault()
            submit()
          }}
          {...props}
        />
      )}
    >
      <DialogTitle>{data?.key}</DialogTitle>
      <DialogContent>
        <div className='flex flex-col flex-1'>
          <FormControl>
            <FormLabel>Type</FormLabel>
            <RadioGroup
              value={type}
              onChange={(e) => {
                setType(e.target.value)
              }}
            >
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
            onChange={(e) => setValue(e.target.value)}
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
