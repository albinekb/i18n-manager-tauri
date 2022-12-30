import React, { useEffect, Suspense } from 'react'

import { FormProvider, useForm, useFormContext } from 'react-hook-form'

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
} from '../../store/atoms'

import { buildKeyTree } from '../../lib/keyTree'
import { CircularProgress } from '@mui/material'
import SuspenseProgress from '../shared/SuspenseProgress'
import { createStore } from 'jotai/vanilla'
import { Provider, useAtomValue, useSetAtom } from 'jotai/react'
import { useMemo } from 'react'

const Preloader = () => {
  useAtomValue(projectInfoAtom)
  useAtomValue(projectLangFiles)
  useAtomValue(projectDataAtom)
  useAtomValue(projectLanguageTreeAtom)
  useAtomValue(addedAtom)
  useAtomValue(deletedAtom)
  useAtomValue(projectLanguagesAtom)

  return null
}

type Props = {
  children: React.ReactNode
  path: string
}

export default function ProjectContextProvider({ children, path }: Props) {
  const store = useMemo(() => {
    if (path) {
      const store = createStore()
      store.set(projectPathAtom, path)
      return store
    }
    return null
  }, [path])

  if (!store) return <SuspenseProgress />

  return (
    <Provider store={store}>
      <Suspense fallback={<SuspenseProgress />}>
        <Preloader />
        <ProjectFormProvider>
          <FormSyncLoader />
          {children}
        </ProjectFormProvider>
      </Suspense>
    </Provider>
  )
}

function FormSyncLoader() {
  const formContext = useFormContext()
  const added = useAtomValue(addedAtom)
  const deleted = useAtomValue(deletedAtom)
  const languages = useAtomValue(projectLanguagesAtom)
  const languageTree = useAtomValue(projectLanguageTreeAtom)
  const isEmptyLanguageTree = '__empty' in languageTree

  const setKeyTree = useSetAtom(keyTreeAtom)

  React.useEffect(() => {
    if (isEmptyLanguageTree) return
    const values = formContext.getValues()
    const keyTree = buildKeyTree(languages, values)

    setKeyTree(keyTree)
  }, [isEmptyLanguageTree, added, deleted])

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
