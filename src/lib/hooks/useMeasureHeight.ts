import {
  MutableRefObject,
  RefObject,
  useDeferredValue,
  useMemo,
  useRef,
  useState,
} from 'react'

import { useIsomorphicLayoutEffect } from 'react-use'

export type UseMeasureHeightRef<E extends Element = Element> = (
  element: E,
) => void

export type UseMeasureHeightResult<E extends Element = Element> = [
  RefObject<E>,
  number,
]

export function useMeasureHeight<
  E extends Element = Element,
>(): UseMeasureHeightResult<E> {
  const ref = useRef<E>(null)

  const [height, setHeight] = useState<number>(0)

  const observer = useMemo(
    () =>
      new (window as any).ResizeObserver((entries) => {
        if (entries[0]) {
          const { height } = entries[0].contentRect
          setHeight(height)
        }
      }),
    [],
  )

  useIsomorphicLayoutEffect(() => {
    if (!ref.current) return
    observer.observe(ref.current)
    return () => {
      observer.disconnect()
    }
  }, [ref])
  const defferedHeight = useDeferredValue(height)
  return [ref, defferedHeight]
}
