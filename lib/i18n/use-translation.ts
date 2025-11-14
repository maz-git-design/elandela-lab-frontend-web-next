'use client'

import { useState, useEffect } from 'react'
import { translations, Language } from './translations'

export function useTranslation() {
  const [language, setLanguage] = useState<Language>('en')

  useEffect(() => {
    const savedLanguage = (localStorage.getItem('language') as Language) || 'en'
    setLanguage(savedLanguage)
  }, [])

  const t = (section: keyof typeof translations.en, key: string): string => {
    const sectionTranslations = translations[language][section]
    if (sectionTranslations && key in sectionTranslations) {
      return sectionTranslations[key as keyof typeof sectionTranslations]
    }
    return key
  }

  const changeLanguage = (newLanguage: Language) => {
    setLanguage(newLanguage)
    localStorage.setItem('language', newLanguage)
  }

  return { t, language, changeLanguage }
}
