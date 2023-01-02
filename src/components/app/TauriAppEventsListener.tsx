import React from 'react'
import { emit, listen } from '@tauri-apps/api/event'
import { useRouter } from 'next/router'

export default function TauriAppEventsListener() {
  const router = useRouter()
  React.useEffect(() => {
    const listener = listen('menu', ({ payload: { action } }: any) => {
      switch (action) {
        case 'home':
          router.replace('/')
          break
        case 'back':
          router.back()
          break
      }
    })
    return () => {
      listener.then((unlisten) => unlisten())
    }
  }, [])
  return null
}
