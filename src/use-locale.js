import { createContext, useSyncExternalStore } from 'react'
import { deviceLocale } from './i18n.js'

export const LocaleContext = createContext('en')

function subscribe(notify) {
  window.addEventListener('languagechange', notify)
  return () => window.removeEventListener('languagechange', notify)
}

export function useDeviceLocale() {
  return useSyncExternalStore(subscribe, deviceLocale)
}
