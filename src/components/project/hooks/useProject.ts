import { readDir, readTextFile } from '@tauri-apps/api/fs'
import React, { useEffect, useMemo } from 'react'
import { join as pathJoin } from 'path'
import flatten from 'flat'
import dotProp from 'dot-prop'
export type Project = {
  languages: string[]
  files: LangFile[]
  projectPath: string
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

export default function useProject(projectPath: string): Project {
  const [files, setFiles] = React.useState<LangFile[]>([])
  const [data, setData] = React.useState<any>()

  useEffect(() => {
    async function init() {
      const dir = await readDir(projectPath)

      if (dir.some((file) => file.name.endsWith('.json'))) {
        setFiles(
          dir
            .filter((file) => file.name.endsWith('.json'))
            .map((file) => ({
              name: file.name,
              path: file.path,
              lang: file.name.split('.')[0],
            })),
        )
      }

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
        .filter((dir) => dir.name.endsWith('.json'))
        .map((file) => ({
          name: file.name,
          path: file.path,
          lang: file.lang,
        }))

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
    () => ({ languages, files, projectPath, data, setData, languageTree }),
    [files, languages, projectPath, data, setData, languageTree],
  )
}
