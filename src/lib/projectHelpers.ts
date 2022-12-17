import { exists, readTextFile } from '@tauri-apps/api/fs'
import { invoke } from '@tauri-apps/api/tauri'
import path from 'path'

export async function getProjectPackageJson(
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
  return null
}

export async function getProjectName(projectPath: string): Promise<string> {
  const packageJson = await getProjectPackageJson(projectPath)
  if (packageJson) {
    return packageJson.name
  }
  return projectPath.split('/').pop()
}
