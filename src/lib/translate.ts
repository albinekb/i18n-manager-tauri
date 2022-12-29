import axios, { AxiosRequestConfig, CancelTokenSource, Method } from 'axios'
import dotProp from 'dot-prop'

import { TranslatePayload, TranslationError, TreeItem } from './types'

const GOOGLE_TRANSLATE_URL =
  'https://translation.googleapis.com/language/translate/v2'

export const translate = async (
  text: string,
  source: string,
  target: string,
  googleTranslateApiKey: string,
  cancelToken: CancelTokenSource,
): Promise<string | TranslationError | undefined> => {
  // Google translate doesn't support localized languages
  const targetLanguage = target
  const sourceLanguage = source

  if (targetLanguage === sourceLanguage) {
    return
  }

  try {
    const response = await fetchAPI(
      `${GOOGLE_TRANSLATE_URL}?key=${googleTranslateApiKey}`,
      'POST',
      {
        target: targetLanguage,
        source: sourceLanguage,
        q: text,
        format: 'text',
      },
      {
        cancelToken: cancelToken.token,
      },
    )

    if (response.status === 200) {
      return getGoogleTranslateText(response.data)
    }

    return {
      error: TRANSLATE_ERRORS.genericGoogleTranslateError(
        sourceLanguage,
        targetLanguage,
      ),
    }
  } catch (e) {
    if (axios.isCancel(e)) {
      throw e
    }

    const errorMessage = e?.message?.response?.data?.error?.message || e

    return {
      error: TRANSLATE_ERRORS.googleTranslateError(
        errorMessage,
        sourceLanguage,
        targetLanguage,
      ),
    }
  }
}

const getGoogleTranslateText = (response: any) =>
  response?.data?.translations?.[0]?.translatedText || ''

function fetchAPI(
  url: string,
  method?: Method,
  data?: any,
  config?: AxiosRequestConfig,
) {
  const requestConfig: AxiosRequestConfig = {
    ...config,
    url,
    method,
    data,
  }

  return axios(requestConfig)
}

const getParsedFiles = (folder: any[], path: string[]) => {
  return []
}

const getFormattedPath = (folder: any[], path: string[], index: number) => {
  return []
}

const getLanguagePath = (path: string[], index: number) => {
  return []
}

export function getTranslationItems(
  folder: any[],
  items: TreeItem[],
  payload: TranslatePayload,
) {
  // Collect all items to be translated
  const translationItems: TranslationItem[] = []

  for (let index = 0; index < items.length; ++index) {
    const item = items[index]
    const parsedFiles = getParsedFiles(folder, item.path)

    const source = parsedFiles.find(
      (it: any) => it.language === payload.sourceLanguage,
    )

    // Get the first filled formatted path
    // This is because some indexes may not have the given path
    let formattedPath: string[] = []
    for (let i = 0; i < parsedFiles.length; i++) {
      formattedPath = getFormattedPath(folder, item.path, i)
      if (formattedPath.length > 0) {
        break
      }
    }

    if (!source) {
      // commit('addTranslationError', {
      //   path: formattedPath,
      //   error: TRANSLATE_ERRORS.noSourceLanguage(payload.sourceLanguage),
      // });
      continue
    }

    const sourceIndex = parsedFiles.indexOf(source)
    const sourceText = dotProp.get(
      getLanguagePath(item.path, sourceIndex),
      folder as any,
    ) as string

    if (!sourceText || sourceText.length === 0) {
      // commit('addTranslationError', {
      //   path: formattedPath,
      //   error: TRANSLATE_ERRORS.emptySourceField(payload.sourceLanguage),
      // });
      continue
    }

    for (
      let parsedFileIndex = 0;
      parsedFileIndex < parsedFiles.length;
      parsedFileIndex++
    ) {
      const currentFile = parsedFiles[parsedFileIndex] as any
      if (
        !currentFile ||
        !payload.targetLanguages.includes(currentFile.language)
      ) {
        continue
      }

      if (parsedFileIndex === sourceIndex) {
        continue
      }

      const text = dotProp.get(
        getLanguagePath(item.path, parsedFileIndex),
        folder as any,
      ) as string
      if (text && text.length > 0 && !payload.overwrite) {
        continue
      }

      translationItems.push({
        sourceLanguage: source.language,
        targetLanguage: currentFile.language,
        sourceText,
        formattedPath,
        index: parsedFileIndex,
        itemId: item.id,
      })
    }
  }

  return translationItems
}

const getLanguageLabel = (language: string) => language

export const TRANSLATE_ERRORS = {
  noSourceLanguage: (sourceLanguage: string) =>
    // eslint-disable-next-line
    `Couldn't translate because this item doesn't have the source language "${getLanguageLabel(
      sourceLanguage,
    )}"`,
  emptySourceField: (sourceLanguage: string) =>
    // eslint-disable-next-line
    `Couldn't translate because the field of the source language "${getLanguageLabel(
      sourceLanguage,
    )}" is empty`,
  genericGoogleTranslateError: (
    sourceLanguage: string,
    targetLanguage: string,
  ) =>
    // eslint-disable-next-line
    `Google Translate can't translate from "${getLanguageLabel(
      sourceLanguage,
    )}" to "${getLanguageLabel(targetLanguage)}"`,
  googleTranslateError: (
    errorMessage: string,
    sourceLanguage: string,
    targetLanguage: string,
  ) =>
    // eslint-disable-next-line
    `Google Translate error: "${errorMessage}"\n translating from "${getLanguageLabel(
      sourceLanguage,
    )}" to "${getLanguageLabel(targetLanguage)}"`,
}

interface TranslationItem {
  sourceLanguage: string
  targetLanguage: string
  sourceText: string
  formattedPath: string[]
  index: number
  itemId: string
}
