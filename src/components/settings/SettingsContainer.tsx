import { Button, TextField } from '@mui/material'
import React, { useCallback, useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'

type Props = {}

type SettingsStore = any

const TRANSLATE_API_KEY = 'translateApiKey'

export default function SettingsContainer({}: Props) {
  const [settings, setSettings] = React.useState<SettingsStore>(null)
  const loadSettings = useCallback(async () => {
    const { Store } = await import('tauri-plugin-store-api')
    const store = new Store('.settings.dat')
    const settings = await store.entries()
    setSettings(
      settings.reduce((obj, [key, value]) => {
        obj[key] = value
        return obj
      }, {}),
    )
  }, [])

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  if (!settings) return null
  return (
    <div>
      SettingsContainer
      <TranslateApiKey settings={settings} loadSettings={loadSettings} />
    </div>
  )
}

function TranslateApiKey({
  settings,
  loadSettings,
}: {
  settings: SettingsStore
  loadSettings: () => Promise<void>
}) {
  const defaultValues = useMemo(
    () => ({
      [TRANSLATE_API_KEY]: settings[TRANSLATE_API_KEY] || '',
    }),
    [settings[TRANSLATE_API_KEY]],
  )
  const { handleSubmit, register, formState, resetField } = useForm({
    defaultValues,
  })

  const submitForm = useCallback(async (values) => {
    const { Store } = await import('tauri-plugin-store-api')
    const store = new Store('.settings.dat')
    const nextValue = values[TRANSLATE_API_KEY] || ''
    if (nextValue) {
      await store.set(TRANSLATE_API_KEY, nextValue)
    } else {
      await store.delete(TRANSLATE_API_KEY)
    }
    await loadSettings()
    resetField(TRANSLATE_API_KEY, {
      defaultValue: nextValue,
    })
  }, [])

  return (
    <form onSubmit={handleSubmit(submitForm)}>
      <TextField label='Translate API Key' {...register(TRANSLATE_API_KEY)} />
      <Button
        type='submit'
        disabled={formState.isSubmitting || !formState.isDirty}
      >
        Save
      </Button>
    </form>
  )
}
