import { readDir, readTextFile } from '@tauri-apps/api/fs'
import React, { useEffect, useMemo } from 'react'
import { join as pathJoin } from 'path'
import flatten from 'flat'
import dotProp from 'dot-prop'
export type Project = {
  languages: string[]
  files: string[]
  projectPath: string
  data: any
  languageTree: any
}

function getValue(key: string, project: Project) {
  const value = {
    __leaf: true,
  }
  for (const lang of project.languages) {
    value[lang] = dotProp.get(project.data[`${lang}.json`], key) || ''
  }
  return value
}
function getLanguageTree(project: Project) {
  const flatLangKeys = project.languages.flatMap((lang) =>
    Object.keys(flatten(project.data[`${lang}.json`] || {})),
  )
  const uniqueKeys = [...new Set(flatLangKeys)]
  return flatten.unflatten(
    uniqueKeys
      .map((key) => ({ key, value: getValue(key, project) }))
      .reduce((acc, { key, value }) => ({ ...acc, [key]: value }), {}),
  )
}

export default function useProject(projectPath: string): Project {
  const [files, setFiles] = React.useState<string[]>([])
  const [data, setData] = React.useState<any>()

  useEffect(() => {
    async function init() {
      const dir = await readDir(projectPath)
      setFiles(
        dir
          .filter((file) => file.name.endsWith('.json'))
          .map((file) => file.name),
      )
    }
    init()
  }, [projectPath])

  const languages = useMemo(() => {
    return files.map((file) => {
      const [language] = file.split('.')
      return language
    })
  }, [files])

  useEffect(() => {
    if (!files?.length) return
    async function init() {
      const loaded = {}
      for (const file of files) {
        const contents = await readTextFile(pathJoin(projectPath, file))
        const json = JSON.parse(contents)
        loaded[file] = json
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
    () => ({ languages, files, projectPath, data, languageTree }),
    [files, languages, projectPath, data, languageTree],
  )
}
