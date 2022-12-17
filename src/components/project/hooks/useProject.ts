import { exists, readDir, readTextFile } from '@tauri-apps/api/fs'
import React, { useEffect, useMemo } from 'react'

import flatten from 'flat'
import dotProp from 'dot-prop'
import path from 'path'
import { invoke } from '@tauri-apps/api/tauri'
import { getProjectName } from '../../../lib/projectHelpers'
export type Project = {
  languages: string[]
  files: LangFile[]
  projectPath: string
  projectName: string
  data: any
  languageTree: any
  setData: (data: any) => void
}

function getValue(key: string, project: Partial<Project>) {
  const value = {
    __leaf: true,
  }
  for (const lang of project.languages) {
    value[lang] = dotProp.get(project.data[lang], key) || ''
  }
  // if (key.includes('index')) {
  //   console.log('i', dotProp.get(project.data['en'], key))
  // }
  if (
    project.languages.every((lang) => {
      const value = dotProp.get(project.data[lang], key)
      if (
        value === undefined ||
        (typeof value === 'object' && Object.keys(value).length === 0)
      )
        return true
    })
  ) {
    return {}
  }
  return value
}
function getLanguageTree(project: Partial<Project>) {
  const flatLangKeys = project.languages.flatMap((lang) =>
    Object.keys(flatten(project.data[lang] || {})),
  )
  const uniqueKeys = [...new Set(flatLangKeys)]
  return flatten.unflatten(
    uniqueKeys
      .map((key) => ({ key, value: getValue(key, project) }))
      .reduce((acc, { key, value }) => ({ ...acc, [key]: value }), {}),
  )
}

type LangFile = {
  name: string
  path: string
  lang: string
}

async function getProjectLanguageFiles(
  projectPath: string,
): Promise<LangFile[]> {
  const root = await readDir(projectPath)

  if (!root.length) {
    return []
  }

  const rootJsonFiles = root.filter((file) => file.name.endsWith('.json'))

  if (rootJsonFiles.length) {
    return rootJsonFiles.map((file) => ({
      name: file.name,
      path: file.path,
      lang: file.name.split('.')[0],
    }))
  }

  const rootPaths = root.map((file) => path.parse(file.path))
  const rootFolders = rootPaths.filter((file) => file.ext === '')

  if (!rootFolders.length) {
    return []
  }

  const rootFolderPaths = rootFolders.map((folder) => path.format(folder))

  const files = (
    await Promise.all(
      rootFolderPaths.map((folderPath, index) =>
        readDir(folderPath).then((files) =>
          files.map((file) => ({
            ...file,
            lang: root[index].name,
          })),
        ),
      ),
    )
  )
    .flatMap((found) => found)
    .filter((dir) => dir.name.endsWith('.json'))
    .map((file) => ({
      name: file.name,
      path: file.path,
      lang: file.lang,
    }))

  return files
}

export default function useProject(projectPath: string): Project {
  const [files, setFiles] = React.useState<LangFile[]>([])
  const [data, setData] = React.useState<any>()
  const [projectName, setProjectName] = React.useState<string>()

  useEffect(() => {
    async function init() {
      const files = await getProjectLanguageFiles(projectPath)
      if (!files?.length) {
        console.error('No files found in project')
        return
      }
      const projectName = await getProjectName(projectPath)
      setProjectName(projectName)
      setFiles(files)
    }
    init()
  }, [projectPath])

  const languages = useMemo(() => {
    return files.map((file) => file.lang)
  }, [files])

  useEffect(() => {
    if (!files?.length) return
    async function init() {
      const loaded = {}
      for (const file of files) {
        const contents = await readTextFile(file.path)
        const json = JSON.parse(contents)
        loaded[file.lang] = json
      }

      setData(loaded)
    }
    init()
  }, [languages])

  const languageTree = useMemo(() => {
    if (!data) return
    return getLanguageTree({
      languages,
      files,
      projectPath,
      data,
      languageTree: null,
    })
  }, [data])
  return useMemo(
    () => ({
      languages,
      files,
      projectPath,
      data,
      setData,
      languageTree,
      projectName,
    }),
    [files, languages, projectPath, data, setData, languageTree, projectName],
  )
}
