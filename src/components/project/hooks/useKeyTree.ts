import { readTextFile } from '@tauri-apps/api/fs'
import React from 'react'
import { Project } from './useProject'

export type KeyTree = {
  id: string
  name: string
  children?: KeyTree[]
  parent: string
}

const createId = (root: string, key: string) => {
  if (root === '') return key
  return `${root}.${key}`
}

function findKeys(json, root) {
  const tree: KeyTree[] = []
  if (!json) return tree
  if (typeof json === 'string') {
    return { name: json, id: createId(root, json), parent: root }
  }
  if (Array.isArray(json)) {
    if (json.every((item) => typeof item === 'string')) {
      return json.map((value, index) => ({
        name: `${index}`,
        id: createId(root, `${index}`),
        parent: root,
      }))
    }
    return json.map((item) => findKeys(item, root))
  }

  for (const key of Object.keys(json)) {
    const value = json[key]
    const id = createId(root, key)
    if (typeof value === 'string') {
      tree.push({ name: key, id, parent: root })
    }
    if (typeof value === 'object') {
      tree.push({
        name: key,
        children: findKeys(value, id),
        id,
        parent: root,
      })
    }
  }
  return tree
}

async function buildKeyTree(project: Project): Promise<KeyTree[]> {
  console.log('building key tree', project)
  return findKeys(project.data[project.files[0]], '')
}

export default function useKeyTree(project: Project) {
  const [keyTree, setKeyTree] = React.useState<KeyTree[]>(null)

  React.useEffect(() => {
    async function init() {
      if (!project?.projectPath || !project?.files?.length || !project.data)
        return
      const keyTree = await buildKeyTree(project)

      setKeyTree(keyTree)
    }
    init()
  }, [project])

  return keyTree
}
