import React, { useEffect, Suspense, useRef, useState, useMemo } from 'react'

import {
  FormProvider,
  useForm,
  useFormContext,
  UseFormReturn,
} from 'react-hook-form'

import {
  addedAtom,
  // deletedAtom,
  keyTreeAtom,
  projectDataAtom,
  projectLanguagesAtom,
  projectLanguageTreeAtom,
  projectInfoAtom,
  projectLangFiles,
  setProjectPathAtom,
  setDirtyFieldsAtom,
  deletedKeysAtom,
} from '../../store/atoms'

import { buildKeyTree } from '../../lib/keyTree'
import SuspenseProgress from '../shared/SuspenseProgress'
import { createStore } from 'jotai/vanilla'
import { Provider, useAtomValue } from 'jotai/react'

import traverse from 'traverse'
import { LanguageTree } from '../../lib/project'

const Preloader = () => {
  useAtomValue(projectInfoAtom)
  useAtomValue(projectLangFiles)
  useAtomValue(projectDataAtom)
  useAtomValue(projectLanguageTreeAtom)
  useAtomValue(addedAtom)
  // useAtomValue(deletedAtom)
  useAtomValue(projectLanguagesAtom)

  return null
}

type Props = {
  children: React.ReactNode
  path: string
}

export type StoreType = ReturnType<typeof createStore>
export let _store: ReturnType<typeof createStore> | undefined
let _storePath: string | null = null
// export let _store = createStore()

export default function ProjectContextProvider({ children, path }: Props) {
  const [isReady, setIsReady] = useState(
    () => (_store && _storePath === path) || false,
  )

  useEffect(() => {
    if (isReady && _store && (!_storePath || _storePath !== path)) {
      setIsReady(false)
    }
    const controller = new AbortController()
    const store = createStore()
    store
      .set(setProjectPathAtom, path, controller.signal)
      .then(() => {
        if (controller.signal.aborted) {
          console.log('aborted')
          return
        }
        _store = store
        _storePath = path
        setIsReady(true)
      })
      .catch((e) => {
        if (e.name === 'AbortError') {
          console.log('aborted')
          return
        }
      })
    return () => {
      controller.abort()
    }
  }, [path])

  if (!isReady) {
    return <SuspenseProgress />
  }

  return (
    <Provider store={_store}>
      <Suspense fallback={<SuspenseProgress />}>
        {/* <Preloader /> */}
        <ProjectFormProvider key={path}>
          <Suspense fallback={null}>
            <FormResetter />
            <FormKeyTreeUpdater />
            <FormDirtyUpdater />
            <ExtractFormContext />
            {children}
          </Suspense>
        </ProjectFormProvider>
      </Suspense>
    </Provider>
  )
}

function FormKeyTreeUpdater() {
  const formContext = useFormContext()
  const added = useAtomValue(addedAtom)
  const deleted = useAtomValue(deletedKeysAtom)
  const languages = useAtomValue(projectLanguagesAtom)
  const languageTree = useAtomValue(projectLanguageTreeAtom)
  const isEmptyLanguageTree = !languages?.length || '__empty' in languageTree

  useEffect(() => {
    if (isEmptyLanguageTree) {
      return
    }
    const values = formContext.getValues()
    const keyTree = buildKeyTree(languages, values)

    _store?.set(keyTreeAtom, keyTree)
  }, [isEmptyLanguageTree, added, deleted])

  return null
}

function FormDirtyUpdater() {
  const formContext = useFormContext()
  useEffect(() => {
    if (!formContext.formState.isDirty) {
      _store?.set(setDirtyFieldsAtom, [])
      return
    }
    const controller = new AbortController()
    const fields = formContext.formState.dirtyFields
    const timeout = setTimeout(() => {
      console.log('dirtyFields')
      const dirty = traverse(fields).reduce(function (set, x) {
        if (this.isLeaf && typeof x === 'boolean') {
          const parts = this.path
          const allExceptLast = parts.slice(0, parts.length - 1)

          set.add(allExceptLast.join('.'))
        }
        return set
      }, new Set<string>())
      if (!controller.signal.aborted) {
        _store?.set(setDirtyFieldsAtom, [...dirty])
      }
    }, 10)
    return () => {
      timeout && clearTimeout(timeout)
      controller.abort()
    }
  }, [formContext.formState])

  return null
}
function FormResetter() {
  const formContext = useFormContext()
  const languages = useAtomValue(projectLanguagesAtom)
  const languageTree = useAtomValue(projectLanguageTreeAtom)
  const isEmptyLanguageTree = !languages?.length || '__empty' in languageTree

  useEffect(() => {
    if (!isEmptyLanguageTree) {
      console.log('formContext.reset')
      formContext.reset(languageTree)
    }
  }, [languageTree])

  return null
}

export let _formContext:
  | undefined
  | Pick<UseFormReturn<LanguageTree, any>, 'resetField' | 'setValue'> =
  undefined

function ExtractFormContext() {
  const { resetField, setValue } = useFormContext()

  useEffect(() => {
    const update = {
      resetField,
      setValue,
    }
    if (!_formContext) {
      _formContext = update
    } else {
      Object.assign(_formContext, update)
    }
  }, [resetField, setValue])
  return null
}

function ProjectFormProvider({ children }: { children: React.ReactNode }) {
  const [options] = useState(() => ({
    defaultValues: _store?.get(projectLanguageTreeAtom),
  }))

  const methods = useForm(options)

  return <FormProvider {...methods}>{children}</FormProvider>
}
