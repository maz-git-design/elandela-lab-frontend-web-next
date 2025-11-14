'use client'

import { translations } from './translations'
import { useLanguage } from './language-provider'

export function useTranslation() {
  const { language, setLanguage } = useLanguage()

  const t = (section: keyof typeof translations.en, key: string): string => {
    const sectionTranslations = translations[language][section]
    if (sectionTranslations && key in sectionTranslations) {
      return sectionTranslations[key as keyof typeof sectionTranslations]
    }
    return key
  }

  return { t, language, changeLanguage: setLanguage }
}
