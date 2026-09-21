import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { Dictionary, en } from './en';
import { es } from './es';

export type Lang = 'en' | 'es';

const STORAGE_KEY = 'presentation-timer-lang';

const DICTS: Record<Lang, Dictionary> = { en, es };

type TFunc = (key: string, vars?: Record<string, string | number>) => string;

interface I18nContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: TFunc;
}

const I18nContext = createContext<I18nContextValue | null>(null);

const detectLang = (): Lang => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'en' || saved === 'es') return saved;
  } catch {
    // Non-fatal: fall back to browser language.
  }
  return navigator.language?.toLowerCase().startsWith('es') ? 'es' : 'en';
};

const resolve = (dict: Dictionary, key: string): unknown =>
  key.split('.').reduce<unknown>(
    (node, part) => (node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined),
    dict
  );

export const I18nProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLangState] = useState<Lang>(detectLang);

  const setLang = (next: Lang) => {
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Non-fatal: language just won't persist.
    }
  };

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const t = useMemo<TFunc>(() => {
    const translate: TFunc = (key, vars) => {
      const value = resolve(DICTS[lang], key);
      let text = typeof value === 'string' ? value : key;
      if (vars) {
        for (const [name, replacement] of Object.entries(vars)) {
          text = text.replaceAll(`{${name}}`, String(replacement));
        }
      }
      return text;
    };
    return translate;
  }, [lang]);

  const value = useMemo(() => ({ lang, setLang, t }), [lang, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = (): I18nContextValue => {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
};
