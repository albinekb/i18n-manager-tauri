export type TreeItemStatus = 'normal' | 'new' | 'changed' | 'missing'
export type TreeItemType = 'folder' | 'file' | 'node' | 'item'

export type TreeMap = Record<string, TreeItem>

export interface TreeItem {
  id: string
  parent: string
  type: TreeItemType
  path: any[]
  label: string
  status: TreeItemStatus
  missingCount: number
  duplicatedCount: number
  level: number
}

export interface TranslatePayload {
  targetLanguages: string[]
  sourceLanguage: string
  mode: 'all' | 'this'
  overwrite: boolean
}

export interface TranslationError {
  error: string
}

export type JSONValue =
  | string
  | number
  | boolean
  | { [x: string]: JSONValue }
  | Array<JSONValue>
