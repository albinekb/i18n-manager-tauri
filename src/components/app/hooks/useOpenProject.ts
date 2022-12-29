import { invoke } from '@tauri-apps/api/tauri'
import { open } from '@tauri-apps/api/dialog'

import { readDir, BaseDirectory } from '@tauri-apps/api/fs'
import { useRouter } from 'next/router'

import { getRecentProjects } from '../../Home/RecentProjects'
import { getProjectName } from '../../../lib/project'
import uniqBy from 'lodash.uniqby'

export default function useOpenProject() {
  const router = useRouter()

  async function openPath(path: string) {
    await invoke('allow_directory', { path })
    const name = await getProjectName(path)
    const store = await import('tauri-plugin-store-api').then(
      ({ Store }) => new Store('.cache.dat'),
    )
    const recent = await getRecentProjects()
    await store.set(
      'recent-projects',
      uniqBy([...recent, { name, path }], 'path').slice(0, 5),
    )
    router.push({
      pathname: '/project',
      query: { path },
    })
  }

  async function openDirectory() {
    const selected = await open({
      multiple: false,
      directory: true,
    })

    if (selected && !Array.isArray(selected)) {
      const dir = await readDir(selected)
      if (!dir.length || !dir.some((file) => file.name?.endsWith('.json'))) {
        const files = (
          await Promise.all(
            dir.map((file, index) =>
              readDir(file.path).then((files) =>
                files.map((file) => ({
                  ...file,
                  lang: dir[index].name,
                })),
              ),
            ),
          )
        )
          .flatMap((found, index) => found)
          .filter((dir) => dir?.name?.endsWith('.json'))

        if (files.length) {
          openPath(selected)
          return
        }
        alert('No JSON files found in this directory')
        return
      }

      openPath(selected)
    }
  }

  return { openDirectory, openPath }
}
