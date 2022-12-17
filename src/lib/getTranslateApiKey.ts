import { TRANSLATE_API_KEY } from './../components/settings/SettingsContainer'
export async function getTranslateApiKey(): Promise<string | null> {
  const { Store } = await import('tauri-plugin-store-api')
  const store = new Store('.settings.dat')
  const key = await store.get(TRANSLATE_API_KEY)

  return (key as string) || null
}
