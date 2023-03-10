let cached: string | null = null

const localeMap = {
  se: 'sv',
  sv: 'se',
  no: 'nb',
  nb: 'no',
}

type MappedLocaleKey = keyof typeof localeMap

export async function getSystemLocale() {
  if (cached) return cached
  const { invoke } = await import('@tauri-apps/api/tauri')
  const locale: string = await invoke('get_sys_locale')
  cached = locale
  return locale
}

export function findLanguage(languages: string[], locale: string): string {
  if (!languages.length) {
    throw new Error('No languages provided to findLanguage()')
  }
  const _locale = locale
  let variants: string[] = [_locale]
  const split = _locale.split('-')
  variants = [split[1], split[0], ...variants].map((variant) =>
    variant.toLowerCase(),
  )

  variants = variants.reduce((acc, variant) => {
    let next: string[] = [...acc]
    if (localeMap[variant as MappedLocaleKey]) {
      next = [localeMap[variant as MappedLocaleKey], variant, ...next]
    } else {
      next = [...next, variant]
    }

    return next
  }, [] as string[])

  const language = variants.find((variant) => languages.includes(variant))
  if (language) return language

  if (languages.includes('en')) {
    console.log(
      'Could not find language for locale',
      _locale,
      'falling back to en',
    )
    return 'en'
  } else {
    console.log(
      'Could not find language for locale',
      _locale,
      'falling back to first language',
    )
    return languages[0]
  }
}
