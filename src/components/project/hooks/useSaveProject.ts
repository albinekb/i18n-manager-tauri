import React, { useCallback, useMemo } from 'react'
import { useFormContext, useFormState } from 'react-hook-form'

import flatten from 'flat'
import dotProp from 'dot-prop'
import { writeFile } from '@tauri-apps/api/fs'
import { useAtom, useAtomValue, useSetAtom } from 'jotai/react'
import {
  addedAtom,
  deletedAtom,
  projectDataAtom,
  projectLangFiles,
  projectLanguagesAtom,
  selectedAtom,
} from '../../../store/atoms'

export default function useSaveProject() {
  const { getValues } = useFormContext()
  const [isSaving, setIsSaving] = React.useState(false)
  const languages = useAtomValue(projectLanguagesAtom)
  const langFiles = useAtomValue(projectLangFiles)

  const setProjectData = useSetAtom(projectDataAtom)
  const [selected, setSelected] = useAtom(selectedAtom)
  const setDeleted = useSetAtom(deletedAtom)
  const setAdded = useSetAtom(addedAtom)

  const saveProject = useCallback(async () => {
    setIsSaving(true)
    try {
      const values = getValues()
      const files: Record<string, string> = {}
      const keys = Object.keys(flatten(values))
        .map((key) => {
          for (const lang of languages) {
            if (key.endsWith(`.${lang}`)) {
              return key.substring(0, key.length - lang.length - 1)
            }
          }

          return key
        })
        .filter((key) => !key.endsWith('__leaf'))
      const uniqueKeys = [...new Set(keys)]

      for (const lang of languages) {
        for (const key of uniqueKeys) {
          const value = dotProp.get(values, `${key}.${lang}`)
          if (value === undefined) continue
          dotProp.set(files, `${lang}.${key}`, value)
        }
      }

      for (const file of langFiles) {
        await writeFile(file.path, JSON.stringify(files[file.lang], null, 2))
      }
      setProjectData(files)
      if (selected && !uniqueKeys.includes(selected)) {
        setSelected(null)
      }
      setDeleted([])
      setAdded([])
    } catch (error) {
      console.error(error)
    } finally {
      setIsSaving(false)
    }
  }, [languages])

  return useMemo(() => ({ saveProject, isSaving }), [saveProject, isSaving])
}
