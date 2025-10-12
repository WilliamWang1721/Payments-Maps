import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// 导入翻译文件
import en from '../locales/en.json';
import ru from '../locales/ru.json';
import de from '../locales/de.json';
import zh from '../locales/zh.json';

// 支持的语言列表
export const supportedLanguages = {
  en: 'English',
  zh: '简体中文',
  ru: 'Русский',
  de: 'Deutsch'
};

// 默认语言
export const defaultLanguage = 'en';

// 获取浏览器语言或从本地存储获取
const getInitialLanguage = (): string => {
  if (typeof window === 'undefined') {
    return defaultLanguage;
  }

  try {
    const savedLanguage = window.localStorage.getItem('language');
    if (savedLanguage && Object.keys(supportedLanguages).includes(savedLanguage)) {
      return savedLanguage;
    }
  } catch (error) {
    console.warn('Unable to access localStorage for language detection:', error);
  }

  // 检查浏览器语言
  try {
    const browserLanguage = window.navigator.language.split('-')[0];
    if (Object.keys(supportedLanguages).includes(browserLanguage)) {
      return browserLanguage;
    }
  } catch (error) {
    console.warn('Unable to read browser language for detection:', error);
  }

  return defaultLanguage;
};

// 初始化 i18n
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      zh: { translation: zh },
      ru: { translation: ru },
      de: { translation: de }
    },
    lng: getInitialLanguage(),
    fallbackLng: defaultLanguage,
    debug: process.env.NODE_ENV === 'development',
    
    interpolation: {
      escapeValue: false // React 已经安全处理了
    },
    
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage']
    }
  });

// 切换语言的辅助函数
export const changeLanguage = (language: string) => {
  if (Object.keys(supportedLanguages).includes(language)) {
    i18n.changeLanguage(language);
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem('language', language);
      } catch (error) {
        console.warn('Unable to persist language preference:', error);
      }
    }
  }
};

// 获取当前语言
export const getCurrentLanguage = () => i18n.language;

// 获取语言显示名称
export const getLanguageDisplayName = (code: string) => {
  return supportedLanguages[code as keyof typeof supportedLanguages] || code;
};

export default i18n;