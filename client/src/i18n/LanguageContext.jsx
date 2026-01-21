import { createContext, useContext, useState, useEffect } from 'react';
import en from '../locales/en';
import zh from '../locales/zh';

const translations = {
  en,
  zh,
};

const LanguageContext = createContext(undefined);

const STORAGE_KEY = 'eve-corp-site-language';

export function LanguageProvider({ children }) {
  // 默认语言为中文
  const [language, setLanguageState] = useState('zh');

  // 初始化：从localStorage读取用户之前的选择
  useEffect(() => {
    const savedLanguage = localStorage.getItem(STORAGE_KEY);
    if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'zh')) {
      setLanguageState(savedLanguage);
    }
  }, []);

  // 切换语言并保存到localStorage
  const setLanguage = (lang) => {
    setLanguageState(lang);
    localStorage.setItem(STORAGE_KEY, lang);
  };

  const value = {
    language,
    setLanguage,
    t: translations[language],
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

// 自定义Hook，方便在组件中使用
export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
