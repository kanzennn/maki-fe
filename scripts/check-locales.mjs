// Fails when a translation key exists in one language but not in another.
// Plural suffixes (_one, _other, …) are ignored, because languages have
// different plural forms: English needs key_one and key_other, Indonesian
// only key_other.
import { readdirSync, readFileSync } from 'node:fs'

const root = new URL('../src/locales/', import.meta.url)
const pluralSuffix = /_(zero|one|two|few|many|other)$/

function flatten(messages, prefix = '') {
  return Object.entries(messages).flatMap(([key, value]) =>
    value !== null && typeof value === 'object'
      ? flatten(value, `${prefix}${key}.`)
      : [`${prefix}${key}`.replace(pluralSuffix, '')],
  )
}

const languages = readdirSync(root, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)

const keysByLanguage = new Map(
  languages.map((language) => {
    const dir = new URL(`${language}/`, root)
    const keys = readdirSync(dir)
      .filter((file) => file.endsWith('.json'))
      .flatMap((file) => {
        const namespace = file.slice(0, -'.json'.length)
        const messages = JSON.parse(readFileSync(new URL(file, dir), 'utf8'))
        return flatten(messages).map((key) => `${namespace}:${key}`)
      })
    return [language, new Set(keys)]
  }),
)

const allKeys = new Set([...keysByLanguage.values()].flatMap((keys) => [...keys]))
const missing = []
for (const [language, keys] of keysByLanguage) {
  for (const key of allKeys) {
    if (!keys.has(key)) missing.push(`${language} is missing ${key}`)
  }
}

if (missing.length > 0) {
  console.error(missing.sort().join('\n'))
  process.exit(1)
}
console.log(`Translations complete: ${languages.join(', ')} · ${allKeys.size} keys`)
