import { useSetAtom } from 'jotai/react'
import { atom } from 'jotai/vanilla'
import { useMemo } from 'react'
type GetReturnType<T> = T extends (...args: any[]) => infer U ? U : never
type AtomType = GetReturnType<typeof atom<string[]>>

export function usePushToAtom(arrayAtom: AtomType) {
  const pushToAtom = useSetAtom(
    useMemo(
      () =>
        atom<null, [string], void>(null, (get, set, key) => {
          const prev = get(arrayAtom)
          set(arrayAtom, [...prev, key])
        }),
      [arrayAtom],
    ),
  )

  return pushToAtom
}
