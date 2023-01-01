import { useEffect, useMemo, useRef } from 'react'
import { useAtomsDebugValue, useAtomsDevtools } from 'jotai/react/devtools'
import { useAtomsSnapshot } from 'jotai/react/devtools'
import { _store } from './ProjectContext'

const DebugAtoms = () => {
  useAtomsDebugValue()
  return null
}

const RegisteredAtoms = () => {
  const atoms = useAtomsSnapshot({
    store: _store as Required<typeof _store>,
  })

  const debugAtoms = useMemo(
    () => Array.from(atoms.values).filter(([atom]) => atom.debugLabel),
    [atoms.values],
  )

  const historyRef = useRef<any>(
    new Map<string, Array<any>>(
      debugAtoms.reduce((acc, [atom, atomValue]) => {
        acc.set(atom.debugLabel, [atomValue])
        return acc
      }, new Map()),
    ),
  )
  useEffect(() => {
    const historyMap = historyRef.current
    for (const [atom, atomValue] of debugAtoms) {
      const history = historyMap.get(atom.debugLabel) || []
      const previous = history[history.length - 1] || null
      if (!previous || previous !== atomValue) {
        console.log(`${atom.debugLabel}: prev: ${previous}, next: ${atomValue}`)
        historyMap.set(atom.debugLabel, [...history, atomValue])
      }
    }

    historyRef.current = historyMap
  }, [debugAtoms])

  return (
    <div>
      <p>Atom count: {atoms.values.size}</p>
      <div>
        {debugAtoms.map(([atom, atomValue]) => (
          <p key={`${atom}`}>{`${atom.debugLabel}: ${atomValue}`}</p>
        ))}
      </div>
    </div>
  )
}
