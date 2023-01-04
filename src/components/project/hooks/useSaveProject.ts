import React, { useCallback, useMemo } from 'react'
import { useFormContext, useFormState } from 'react-hook-form'

import flatten from 'flat'
import dotProp from 'dot-prop'
import { writeFile } from '@tauri-apps/api/fs'
import { useAtom, useAtomValue, useSetAtom } from 'jotai/react'
import {
  addedAtom,
  setDeletedMapAtom,
  getSelectedKeyAtom,
  isSavingProjectAtom,
  projectDataAtom,
  projectLangFiles,
  projectLanguagesAtom,
  restoreDeletedFieldAtom,
  selectedAtom,
  setSelectedKeyAtom,
} from '../../../store/atoms'
import { _store } from '../../app/ProjectContext'

export default function useSaveProject() {
  const { getValues } = useFormContext()
  const languages = useAtomValue(projectLanguagesAtom)
  const langFiles = useAtomValue(projectLangFiles)

  const saveProject = useCallback(async () => {
    if (_store?.get(isSavingProjectAtom) !== false) {
      throw new Error('Project is already saving')
    }
    _store?.set(isSavingProjectAtom, true)
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
      _store?.set(projectDataAtom, files)
      const selected = _store?.get(getSelectedKeyAtom)
      if (selected && !uniqueKeys.includes(selected)) {
        _store?.set(setSelectedKeyAtom, null)
      }
      _store?.set(addedAtom, [])
      _store?.set(setDeletedMapAtom, new Map())
    } catch (error) {
      console.error(error)
    } finally {
      _store?.set(isSavingProjectAtom, false)
    }
  }, [languages, langFiles])

  return saveProject
}
