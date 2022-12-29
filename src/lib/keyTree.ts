import sortOn from 'sort-on'
import { LanguageTree } from './project'

export type KeyTree = {
  id: string
  name: string
  children?: KeyTree[]
  parent: string
  score?: number
}

const createId = (root: string, key: string) => {
  if (root === '') return key
  return `${root}.${key}`
}

export function findKeys(
  json: LanguageTree | LanguageTree[] | string | string[],
  root: string,
  languages: string[],
): KeyTree[] | undefined {
  const tree: KeyTree[] = []

  if (!json) return tree
  if (typeof json === 'string') {
    return [{ name: json as string, id: createId(root, json), parent: root }]
  }
  if (Array.isArray(json)) {
    if ((json as Array<any>).every((item: any) => typeof item === 'string')) {
      return json.map((value, index) => ({
        name: `${index}`,
        id: createId(root, `${index}`),
        parent: root,
      }))
    }
    return sortOn(
      json.flatMap((item) => findKeys(item, root, languages)).filter(Boolean),
      ['name', 'score'],
    )
  }

  const jsonKeys = Object.keys(json).filter((key) => key !== '__leaf')

  if (
    jsonKeys.length >= languages.length &&
    languages.every((key) => jsonKeys.includes(key))
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
      const children = findKeys(value, id, languages)
      const score: number | undefined = value.score
        ? (value as any).score
        : children
        ? children.reduce((acc, child) => acc + (child?.score || 0), 0) /
          children.length
        : undefined

      tree.push({
        name: key,
        children: children ? sortOn(children, ['name', 'score']) : children,
        id,
        parent: root,
        score,
      })
    }
  }
  return sortOn(tree, ['name', 'score'])
}

export function buildKeyTree(
  languages: string[],
  values: LanguageTree,
): KeyTree[] {
  // console.log('building key tree', project)
  return findKeys(values, '', languages)?.filter(Boolean) || []
}
