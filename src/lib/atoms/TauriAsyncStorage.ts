import { unstable_NO_STORAGE_VALUE, atomWithStorage } from 'jotai/vanilla/utils'
import { AsyncStorage } from 'jotai/vanilla/utils/atomWithStorage'
import type { Store } from 'tauri-plugin-store-api'

const stores = new Map<string, Store>()

const getStore = async (name): Promise<Store> => {
  const cached = stores.get(name)
  if (cached) return cached
  const { Store } = await import('tauri-plugin-store-api')
  const store = new Store(name)
  stores.set(name, store)
  return store
}

export function atomWithTauriStorage<Value>(
  key: string,
  initialValue: Value,
  storage?: TauriAsyncStorage<Value>,
) {
  const atom = atomWithStorage<Value>(
    key,
    initialValue,
    storage?.storage<Value>(),
  )
  return atom
}

export class TauriAsyncStorage<Value = any> implements AsyncStorage<Value> {
  private name: string
  constructor(name: string) {
    this.name = name
  }

  storage<T>() {
    return this as AsyncStorage<T>
  }

  getItem = async (key: string) => {
    const store = await getStore(this.name)
    if (await store.has(key)) {
      return store.get<Value>(key) as Promise<Value>
    }
    return unstable_NO_STORAGE_VALUE
  }
  setItem = async (key: string, value) => {
    const store = await getStore(this.name)
    return store.set(key, value)
  }
  removeItem = async (key: string) => {
    const store = await getStore(this.name)
    await store.delete(key)
  }
}
