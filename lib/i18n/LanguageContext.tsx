'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { Language } from './types'
import { en } from './en'
import { hi } from './hi'

interface LanguageContextType {
  lang: Language
  setLang: (lang: Language) => void
  t: (key: string, params?: Record<string, string | number>) => string
}

const dictionaries = { en, hi }

const LanguageContext = createContext<LanguageContextType>({
  lang: 'en',
  setLang: () => {},
  t: (key: string) => key,
})

const STORAGE_KEY = 'coopserve_lang'

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>('en')
  const [isInitialized, setIsInitialized] = useState(false)

  // Load language from localStorage once mounted
  useEffect(() => {
    try {
      const savedLang = localStorage.getItem(STORAGE_KEY) as Language
      if (savedLang === 'en' || savedLang === 'hi') {
        setLangState(savedLang)
      }
    } catch {
      // localStorage may not be accessible in private mode
    } finally {
      setIsInitialized(true)
    }
  }, [])

  // Persist language on change
  const setLang = useCallback((newLang: Language) => {
    setLangState(newLang)
    try {
      localStorage.setItem(STORAGE_KEY, newLang)
    } catch {
      // ignore
    }
  }, [])

  // Translation lookup with nested dot notation and parameter interpolation
  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      const dict = dictionaries[lang] || dictionaries.en
      const fallbackDict = dictionaries.en

      const resolve = (obj: any, path: string): any => {
        const parts = path.split('.')
        let current = obj
        for (const part of parts) {
          if (current && typeof current === 'object' && part in current) {
            current = current[part]
          } else {
            return undefined
          }
        }
        return typeof current === 'string' ? current : undefined
      }

      let text = resolve(dict, key)
      if (!text && lang !== 'en') {
        text = resolve(fallbackDict, key)
      }

      if (!text) {
        // Return the last key part as fallback rather than empty
        const parts = key.split('.')
        return parts[parts.length - 1] || key
      }

      // Parameter interpolation e.g. {count}, {name}
      if (params) {
        Object.entries(params).forEach(([paramKey, val]) => {
          text = (text as string).replace(
            new RegExp(`\\{${paramKey}\\}`, 'g'),
            String(val)
          )
        })
      }

      return text
    },
    [lang]
  )

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useTranslation() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider')
  }
  return context
}
