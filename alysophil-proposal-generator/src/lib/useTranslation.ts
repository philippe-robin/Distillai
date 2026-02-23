import { useProposalStore } from './proposal-store';
import en from '../i18n/en.json';
import fr from '../i18n/fr.json';

const translations: Record<string, Record<string, unknown>> = { en, fr };

export function useTranslation() {
  const language = useProposalStore((s) => s.data.language);

  function t(key: string): string {
    const keys = key.split('.');
    let value: unknown = translations[language];
    for (const k of keys) {
      if (value && typeof value === 'object') {
        value = (value as Record<string, unknown>)[k];
      } else {
        return key;
      }
    }
    return typeof value === 'string' ? value : key;
  }

  return { t, language };
}
