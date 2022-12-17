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

type RecentProject = {
  path: string
  name: string
}

export async function getRecentProjects(): Promise<RecentProject[]> {
  const { Store } = await import('tauri-plugin-store-api')
  const store = new Store('.cache.dat')
  const recent = (await store.get('recent-projects')) as RecentProject[]
  return recent || []
}

export default function RecentProjects() {
  const { openPath } = useOpenProject()
  const [recent, setRecent] = useState<RecentProject[]>([])

  useEffect(() => {
    getRecentProjects().then(setRecent)
  }, [])
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
