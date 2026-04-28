import { de } from './translations.de'
import { en } from './translations.en'

type TranslationDictionary = typeof en

type EnsureExactTranslationKeys<
  Expected extends TranslationDictionary,
  Actual extends Record<string, string>,
> = Exclude<keyof Expected, keyof Actual> extends never
  ? Exclude<keyof Actual, keyof Expected> extends never
    ? Actual
    : never
  : never

const deDictionary: EnsureExactTranslationKeys<TranslationDictionary, typeof de> =
  de

export const translations = {
  en,
  de: deDictionary,
} as const

export type TranslationLanguage = keyof typeof translations
export type TranslationKey = keyof TranslationDictionary
