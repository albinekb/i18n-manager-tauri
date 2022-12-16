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
  Radio,
  RadioGroup,
  TextField,
} from '@mui/material'
import {
  AddCircleOutline,
  ContentCopy,
  ContentCut,
  DeleteForever,
} from '@mui/icons-material'

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
    setDialog({
      data: contextMenu?.data,
      action: 'new',
    })
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
        <MenuItem onClick={handleClose}>
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
  const [type, setType] = React.useState('node')
  const [value, setValue] = React.useState('')
  return (
    <Dialog open={true}>
      <DialogTitle>{data?.key}</DialogTitle>
      <DialogContent>
        <div className='flex flex-col flex-1'>
          <FormControl>
            <FormLabel id='demo-controlled-radio-buttons-group'>
              Gender
            </FormLabel>
            <RadioGroup
              aria-labelledby='demo-controlled-radio-buttons-group'
              name='controlled-radio-buttons-group'
              value={type}
              onChange={(e) => {
                setType(e.target.value)
              }}
            >
              <FormControlLabel
                value='value'
                control={<Radio />}
                label='value'
              />
              <FormControlLabel value='node' control={<Radio />} label='node' />
            </RadioGroup>
          </FormControl>
          <TextField value={value} onChange={(e) => setValue(e.target.value)} />
        </div>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
      </DialogActions>
    </Dialog>
  )
}
