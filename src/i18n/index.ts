import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// English translations
import commonEN from './locales/en/common.json';
import navigationEN from './locales/en/navigation.json';
import dashboardEN from './locales/en/dashboard.json';
import authEN from './locales/en/auth.json';
import projectsEN from './locales/en/projects.json';
import visitsEN from './locales/en/visits.json';
import tasksEN from './locales/en/tasks.json';
import paymentsEN from './locales/en/payments.json';
import regulatoryEN from './locales/en/regulatory.json';
import libraryEN from './locales/en/library.json';
import centersEN from './locales/en/centers.json';
import adminEN from './locales/en/admin.json';
import communicationsEN from './locales/en/communications.json';
import settingsEN from './locales/en/settings.json';

// Portuguese translations
import commonPTBR from './locales/pt-BR/common.json';
import navigationPTBR from './locales/pt-BR/navigation.json';
import dashboardPTBR from './locales/pt-BR/dashboard.json';
import authPTBR from './locales/pt-BR/auth.json';
import projectsPTBR from './locales/pt-BR/projects.json';
import visitsPTBR from './locales/pt-BR/visits.json';
import tasksPTBR from './locales/pt-BR/tasks.json';
import paymentsPTBR from './locales/pt-BR/payments.json';
import regulatoryPTBR from './locales/pt-BR/regulatory.json';
import libraryPTBR from './locales/pt-BR/library.json';
import centersPTBR from './locales/pt-BR/centers.json';
import adminPTBR from './locales/pt-BR/admin.json';
import communicationsPTBR from './locales/pt-BR/communications.json';
import settingsPTBR from './locales/pt-BR/settings.json';

const resources = {
  en: {
    common: commonEN,
    navigation: navigationEN,
    dashboard: dashboardEN,
    auth: authEN,
    projects: projectsEN,
    visits: visitsEN,
    tasks: tasksEN,
    payments: paymentsEN,
    regulatory: regulatoryEN,
    library: libraryEN,
    centers: centersEN,
    admin: adminEN,
    communications: communicationsEN,
    settings: settingsEN,
  },
  'pt-BR': {
    common: commonPTBR,
    navigation: navigationPTBR,
    dashboard: dashboardPTBR,
    auth: authPTBR,
    projects: projectsPTBR,
    visits: visitsPTBR,
    tasks: tasksPTBR,
    payments: paymentsPTBR,
    regulatory: regulatoryPTBR,
    library: libraryPTBR,
    centers: centersPTBR,
    admin: adminPTBR,
    communications: communicationsPTBR,
    settings: settingsPTBR,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    defaultNS: 'common',
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'preferred-language',
    },
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
