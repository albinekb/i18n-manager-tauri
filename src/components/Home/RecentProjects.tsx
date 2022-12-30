import React, { useState, useEffect } from 'react'
import {
  List,
  ListItemButton,
  ListItemText,
  ListSubheader,
  ListItemIcon,
} from '@mui/material'
import { ChevronRight } from '@mui/icons-material'
import useOpenProject from '../app/hooks/useOpenProject'
import { useAtomValue } from 'jotai/react'
import { recentProjectsAtom } from '../app/atoms'

export default function RecentProjects() {
  const { openPath } = useOpenProject()
  const recent = useAtomValue(recentProjectsAtom)
  return (
    <List subheader={<ListSubheader>Recent</ListSubheader>}>
      {recent?.map(({ path, name }) => (
        <ListItemButton key={path} onClick={() => openPath(path)}>
          <ListItemText primary={name} secondary={path} />

          <ListItemIcon>
            <ChevronRight />
          </ListItemIcon>
        </ListItemButton>
      ))}
    </List>
  )
}
