import React, { useEffect, Suspense } from 'react'

import { FormProvider, useForm, useFormContext } from 'react-hook-form'
import { Provider, useAtomValue, useSetAtom } from 'jotai'
import {
  addedAtom,
  deletedAtom,
  keyTreeAtom,
  projectDataAtom,
  projectLanguagesAtom,
  projectLanguageTreeAtom,
  projectPathAtom,
  projectInfoAtom,
  projectLangFiles,
} from './atoms'

import { buildKeyTree } from '../../lib/keyTree'
import { CircularProgress } from '@mui/material'
import SuspenseProgress from '../shared/SuspenseProgress'

export const Preloader = () => {
  useAtomValue(projectInfoAtom)
  useAtomValue(projectLangFiles)
  useAtomValue(projectDataAtom)
  useAtomValue(projectLanguageTreeAtom)
  useAtomValue(keyTreeAtom)

  return null
}

type Props = {
  children: React.ReactNode
  path: string
}

export default function ProjectContextProvider({ children, path }: Props) {
  return (
    <Provider initialValues={[[projectPathAtom, path]]}>
      <Suspense fallback={<SuspenseProgress />}>
        <Preloader />
        <ProjectFormProvider>
          <FormPreloader />
          {children}
        </ProjectFormProvider>
      </Suspense>
    </Provider>
  )
}

function FormPreloader() {
  const formContext = useFormContext()
  const added = useAtomValue(addedAtom)
  const deleted = useAtomValue(deletedAtom)
  const data = useAtomValue(projectDataAtom)
  const languages = useAtomValue(projectLanguagesAtom)
  const setKeyTree = useSetAtom(keyTreeAtom)

  React.useEffect(() => {
    if (!data) return
    const values = formContext.getValues()
    const keyTree = buildKeyTree(languages, values)

    setKeyTree(keyTree)
  }, [data, added, deleted])

  return null
}
function ProjectFormProvider({ children }: { children: React.ReactNode }) {
  const languageTree = useAtomValue(projectLanguageTreeAtom)
  const methods = useForm({
    defaultValues: languageTree,
  })

  useEffect(() => {
    if (languageTree) {
      methods.reset(languageTree)
    }
  }, [languageTree])

  return <FormProvider {...methods}>{children}</FormProvider>
}
