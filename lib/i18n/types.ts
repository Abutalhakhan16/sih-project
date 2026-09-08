export type Language = 'en' | 'hi'

export interface TranslationDictionary {
  [key: string]: string | TranslationDictionary
}
