import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const appRoot = path.resolve(__dirname, '..')

const translationFiles = {
  en: path.join(appRoot, 'src/app/core/i18n/translations.en.ts'),
  de: path.join(appRoot, 'src/app/core/i18n/translations.de.ts'),
}

const lowerCamelSegmentPattern = /^[a-z][A-Za-z0-9]*$/

function readSource(filePath) {
  return fs.readFileSync(filePath, 'utf8')
}

function loadDictionary(filePath) {
  const source = readSource(filePath)
    .replace(/^export const \w+ = /, 'module.exports = ')
    .replace(/\s+as const\s*$/, '')

  return vm.runInNewContext(source, { module: { exports: {} } })
}

function extractEntries(filePath) {
  return readSource(filePath)
    .split(/\r?\n/)
    .flatMap((line, index) => {
      const match = line.match(/^\s*(?:'([^']+)'|([A-Za-z_$][\w$]*))\s*:/)
      if (!match) {
        return []
      }

      return [
        {
          key: match[1] ?? match[2],
          quoted: Boolean(match[1]),
          lineNumber: index + 1,
        },
      ]
    })
}

function isStyledKey(key) {
  return (
    key.includes('.') &&
    key.split('.').every((segment) => lowerCamelSegmentPattern.test(segment))
  )
}

function fail(errors) {
  for (const error of errors) {
    console.error(`- ${error}`)
  }

  process.exit(1)
}

const entriesByLanguage = Object.fromEntries(
  Object.entries(translationFiles).map(([language, filePath]) => [
    language,
    extractEntries(filePath),
  ]),
)

const dictionaries = Object.fromEntries(
  Object.entries(translationFiles).map(([language, filePath]) => [
    language,
    loadDictionary(filePath),
  ]),
)

const enKeys = Object.keys(dictionaries.en)
const deKeys = Object.keys(dictionaries.de)

const errors = []

const onlyInEn = enKeys.filter((key) => !deKeys.includes(key))
const onlyInDe = deKeys.filter((key) => !enKeys.includes(key))

if (onlyInEn.length > 0) {
  errors.push(`Missing in DE: ${onlyInEn.join(', ')}`)
}

if (onlyInDe.length > 0) {
  errors.push(`Missing in EN: ${onlyInDe.join(', ')}`)
}

const enEntryKeys = entriesByLanguage.en.map((entry) => entry.key)
const deEntryKeys = entriesByLanguage.de.map((entry) => entry.key)

if (JSON.stringify(enEntryKeys) !== JSON.stringify(deEntryKeys)) {
  errors.push('DE and EN use a different key order.')
}

for (const [language, entries] of Object.entries(entriesByLanguage)) {
  const sortedKeys = [...entries.map((entry) => entry.key)].sort((left, right) =>
    left.localeCompare(right),
  )
  const actualKeys = entries.map((entry) => entry.key)

  if (JSON.stringify(actualKeys) !== JSON.stringify(sortedKeys)) {
    errors.push(`${language.toUpperCase()} keys are not sorted alphabetically.`)
  }

  for (const entry of entries) {
    if (!isStyledKey(entry.key)) {
      errors.push(
        `${language.toUpperCase()} has a non-conforming key "${entry.key}" on line ${entry.lineNumber}. Expected dot notation with lower camelCase segments.`,
      )
    }

    if (!entry.quoted) {
      errors.push(
        `${language.toUpperCase()} must quote "${entry.key}" on line ${entry.lineNumber}.`,
      )
    }
  }
}

if (errors.length > 0) {
  fail(errors)
}

console.log(`Translations OK: ${enKeys.length} aligned keys in DE and EN.`)
