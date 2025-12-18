import { writable, derived } from 'svelte/store';
import type { Locale, Messages } from './types';
import en from './locales/en';
import pt from './locales/pt';

const locales: Record<Locale, Messages> = { en, pt };

const localeStore = writable<Locale>('en');

export const locale = {
  subscribe: localeStore.subscribe
};

export const t = derived(localeStore, ($locale) => {
  return (key: string, params?: Record<string, string | number>): string => {
    let message = locales[$locale]?.[key] ?? key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        message = message.replace(`{${k}}`, String(v));
      });
    }
    return message;
  };
});

export function setLocale(newLocale: Locale): void {
  localStorage.setItem('flowbin_locale', newLocale);
  localeStore.set(newLocale);
}

export async function initLocale(): Promise<void> {
  const saved = localStorage.getItem('flowbin_locale') as Locale | null;
  localeStore.set(saved ?? 'pt');
}
