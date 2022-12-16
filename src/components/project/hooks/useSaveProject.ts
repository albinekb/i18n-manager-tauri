import React, { useCallback, useMemo } from 'react'
import { useFormContext, useFormState } from 'react-hook-form'

import flatten from 'flat'
import dotProp from 'dot-prop'
import { writeFile } from '@tauri-apps/api/fs'

import { useProjectContext } from '../../app/ProjectContext'

type Props = {}

export default function useSaveProject() {
  const { getValues } = useFormContext()
  const projectContext = useProjectContext()
  const [isSaving, setIsSaving] = React.useState(false)
  const languages = projectContext.project.languages
  const saveProject = useCallback(async () => {
    setIsSaving(true)
    try {
      const values = getValues()
      const files = {}
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

      for (const file of projectContext.project.files) {
        await writeFile(file.path, JSON.stringify(files[file.lang], null, 2))
      }
      projectContext.project.setData(files)
      if (!uniqueKeys.includes(projectContext.selected)) {
        projectContext.setSelected(null)
      }
    } catch (error) {
      console.error(error)
    } finally {
      setIsSaving(false)
    }
  }, [languages])

  return { saveProject, isSaving }
}
