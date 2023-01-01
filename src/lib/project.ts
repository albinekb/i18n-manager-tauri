import { exists, readDir, readTextFile } from '@tauri-apps/api/fs'

import flatten from 'flat'
import dotProp from 'dot-prop'
import path from 'path'

import { invoke } from '@tauri-apps/api/tauri'
import pMemoize from 'p-memoize'

async function getProjectPackageJson(
  projectPath: string,
): Promise<{ name: string } | null> {
  const foldersToCheck = [
    path.resolve(projectPath, '../'),
    path.resolve(projectPath, '../../'),
    path.resolve(projectPath, '../../../'),
  ]

  for (const folder of foldersToCheck) {
    const packageJsonPath = path.resolve(folder, 'package.json')
    await invoke('allow_file', { path: packageJsonPath })
    const hasPackageJson = await exists(packageJsonPath)
    if (hasPackageJson) {
      const packageJson = JSON.parse(await readTextFile(packageJsonPath))
      return packageJson
    }
  }
  throw new Error('No package.json found in project folder')
}

const memoizedGetProjectPackageJson = pMemoize(getProjectPackageJson)

export async function getProjectName(
  projectPath: string,
  signal?: AbortSignal,
): Promise<string> {
  if (signal?.aborted) {
    return Promise.reject(new DOMException('Aborted', 'AbortError'))
  }
  const packageJson = await memoizedGetProjectPackageJson(projectPath)
  if (packageJson?.name) {
    return packageJson.name
  }
  return projectPath.split('/').pop() || projectPath || ''
}

export function getValue(
  key: string,
  project: { data: any; languages: string[] },
) {
  const value: any = {
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
        (value && typeof value === 'object' && Object.keys(value).length === 0)
      )
        return true
    })
  ) {
    return {}
  }
  return value
}

export type LanguageTree = {
  [key: string]: string | LanguageTree
}

export function getLanguageTree(project: {
  languages: string[]
  data: LanguageTree
}): LanguageTree {
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

export type LangFile = {
  name: string
  path: string
  lang: string
}

export async function getProjectLanguageFiles(
  projectPath: string,
): Promise<LangFile[]> {
  const root = await readDir(projectPath)

  if (!root.length) {
    return []
  }

  const rootJsonFiles = root.filter((file) =>
    file?.name?.endsWith('.json'),
  ) as { name: string; path: string }[]

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
    .filter((dir) => dir?.name?.endsWith('.json'))
    .map(
      (file) =>
        ({
          name: file.name,
          path: file.path,
          lang: file.lang,
        } as LangFile),
    )

  return files
}
