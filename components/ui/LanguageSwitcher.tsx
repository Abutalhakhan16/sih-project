'use client'

import React from 'react'
import { useTranslation } from '@/lib/i18n/LanguageContext'
import { Globe } from 'lucide-react'

export default function LanguageSwitcher({ className = '' }: { className?: string }) {
  const { lang, setLang } = useTranslation()

  return (
    <div
      className={`lang-switcher-wrap ${className}`}
      role="group"
      aria-label="Language selection"
    >
      <Globe size={14} className="lang-icon" />
      <button
        type="button"
        className={`lang-btn ${lang === 'en' ? 'active' : ''}`}
        onClick={() => setLang('en')}
        title="Switch to English"
      >
        English
      </button>
      <span className="lang-divider">|</span>
      <button
        type="button"
        className={`lang-btn ${lang === 'hi' ? 'active' : ''}`}
        onClick={() => setLang('hi')}
        title="हिंदी में बदलें"
      >
        हिंदी
      </button>
    </div>
  )
}
