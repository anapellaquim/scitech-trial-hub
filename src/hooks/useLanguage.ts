import { useTranslation } from 'react-i18next';

export type Language = 'en' | 'pt-BR';

export interface LanguageOption {
  code: Language;
  name: string;
  flag: string;
}

export const languages: LanguageOption[] = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'pt-BR', name: 'Português (Brasil)', flag: '🇧🇷' },
];

export function useLanguage() {
  const { i18n } = useTranslation();

  const changeLanguage = (lang: Language) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('preferred-language', lang);
    document.documentElement.lang = lang;
  };

  const currentLanguage = (i18n.language || 'en') as Language;
  
  const currentLanguageOption = languages.find(l => l.code === currentLanguage) || languages[0];

  return {
    currentLanguage,
    currentLanguageOption,
    changeLanguage,
    languages,
  };
}
