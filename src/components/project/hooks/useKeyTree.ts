import { readTextFile } from '@tauri-apps/api/fs'
import React from 'react'
import { useFormContext } from 'react-hook-form'
import { useProjectContext } from '../../app/ProjectContext'
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

function findKeys(json, root, languages) {
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
    return json.map((item) => findKeys(item, root, languages))
  }

  const jsonKeys = Object.keys(json).filter((key) => key !== '__leaf')

  if (
    jsonKeys.length === languages.length &&
    jsonKeys.every((key) => languages.includes(key))
  ) {
    return undefined
  }

  for (const key of jsonKeys) {
    const value = json[key]
    const id = createId(root, key)

    if (typeof value === 'string') {
      tree.push({ name: key, id, parent: root })
    }
    if (typeof value === 'object') {
      tree.push({
        name: key,
        children: findKeys(value, id, languages),
        id,
        parent: root,
      })
    }
  }
  return tree
}

async function buildKeyTree(project: Project, values): Promise<KeyTree[]> {
  console.log('building key tree', project)
  const languages = project.languages
  return findKeys(values, '', languages)
}

export default function useKeyTree(project: Project) {
  const formContext = useFormContext()
  const projectContext = useProjectContext()
  const [keyTree, setKeyTree] = React.useState<KeyTree[]>(null)

  React.useEffect(() => {
    async function init() {
      if (
        !project?.projectPath ||
        !project?.files?.length ||
        !project.data ||
        !project.languages?.length
      ) {
        return
      }
      const keyTree = await buildKeyTree(project, formContext.getValues())

      setKeyTree(keyTree)
    }
    init()
  }, [project.data, projectContext.added, projectContext.deleted])

  return keyTree
}
