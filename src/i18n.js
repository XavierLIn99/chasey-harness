import simplified from './messages/zh-Hans.json' with { type: 'json' }
import traditional from './messages/zh-Hant.json' with { type: 'json' }

const catalogs = { 'zh-Hans': simplified, 'zh-Hant': traditional }

export function resolveLocale(preferences = []) {
  for (const tag of preferences) {
    try {
      const locale = new Intl.Locale(tag)
      if (locale.language === 'en') return 'en'
      if (locale.language === 'zh') {
        return locale.maximize().script === 'Hant' ? 'zh-Hant' : 'zh-Hans'
      }
    } catch {
      // Try the next language when a host supplies a malformed tag.
    }
  }
  return 'en'
}

let previousPreferences, currentLocale

export function deviceLocale() {
  const device = globalThis.navigator
  const preferences = device?.languages?.length ? device.languages : [device?.language]
  const key = preferences.join(',')
  if (key !== previousPreferences) {
    previousPreferences = key
    currentLocale = resolveLocale(preferences)
  }
  return currentLocale
}

export function t(message, values = {}, locale = deviceLocale()) {
  const template = catalogs[locale]?.[message] ?? message
  return template.replace(/\{(\w+)\}/g, (token, name) => values[name] ?? token)
}
