import type { AppProps } from 'next/app'
import createEmotionCache from '../lib/createEmotionCache'
import { CacheProvider } from '@emotion/react'
import Head from 'next/head'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import theme from '../lib/theme'
import '../styles/globals.css'
import AppEventContext from '../components/app/AppEventContext'

import { StyledEngineProvider } from '@mui/material/styles'

// Client-side cache, shared for the whole session of the user in the browser.
const clientSideEmotionCache = createEmotionCache()

interface MyAppProps extends AppProps {
  emotionCache?: typeof clientSideEmotionCache
}
// This default export is required in a new `pages/_app.js` file.
export default function MyApp(props: MyAppProps) {
  const { Component, emotionCache = clientSideEmotionCache, pageProps } = props
  return (
    <CacheProvider value={emotionCache}>
      <Head>
        <meta name='viewport' content='initial-scale=1, width=device-width' />
      </Head>
      <StyledEngineProvider injectFirst>
        <ThemeProvider theme={theme}>
          {/* CssBaseline kickstart an elegant, consistent, and simple baseline to build upon. */}
          <CssBaseline />
          <AppEventContext>
            <Component {...pageProps} />
          </AppEventContext>
        </ThemeProvider>
      </StyledEngineProvider>
    </CacheProvider>
  )
}
