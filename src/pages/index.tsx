import { Provider } from 'jotai/react'
import dynamic from 'next/dynamic'

const HomeScreen = dynamic(() => import('../components/Home/HomeScreen'), {
  ssr: false,
})

// import { WebviewWindow } from '@tauri-apps/api/window'

function App() {
  return (
    <Provider>
      <HomeScreen />
    </Provider>
  )
}

export default App
