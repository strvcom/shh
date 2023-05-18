import fs from 'fs'
import path from 'path'
import { globSync } from 'glob'
import inquirer from 'inquirer'

import type { GlobalOptions } from './config'

export interface Environment {
  file: string
  name: string
  relative: string
}

const defaultTemplate = '# Environment: [name]\n'

/**
 * Check if a template file exists.
 */
const templateExists = (config: GlobalOptions) =>
  fs.existsSync(path.resolve(config.cwd, config.template))

/**
 * Read the template file.
 */
const readTemplate = (config: GlobalOptions) =>
  templateExists(config)
    ? fs.readFileSync(path.resolve(config.cwd, config.template), 'utf-8')
    : defaultTemplate

/**
 * Create template file.
 */
const createTemplate = async (config: GlobalOptions, content: string) => {
  const file = path.resolve(config.cwd, config.template)

  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, content, 'utf-8')
}

/**
 * Translate environments pattern into glob pattern.
 */
const getEnvironmentsPattern = (config: GlobalOptions) =>
  path.normalize(config.environments.replace('[name]', '*'))

/**
 * Resolve environment paths and their names.
 */
const getEnvironments = (config: GlobalOptions, allowEmpty = false): Environment[] => {
  const pattern = getEnvironmentsPattern(config)

  const regex = new RegExp(
    `^${path
      .resolve(config.cwd, config.environments)
      .replace('**', '.+')
      .replace('*', '[^ /]+')
      .replace('[name]', '(?<name>[a-zA-Z0-9]+)')}$`
  )

  const environments = globSync(pattern, { cwd: config.cwd, absolute: true })
    // Ignore template file.
    .filter((file) => !file.endsWith(config.template))
    // Resolve environment meta from file path.
    .map((file) => {
      const name = file.match(regex)?.groups?.name

      if (!name) {
        throw new Error(`Could not resolve enviromnet name for file: "${file}"`)
      }

      return { file, name, relative: path.relative(config.cwd, file) }
    })

  if (!allowEmpty && !environments.length) {
    throw new Error(`No environments found at "${config.environments}"`)
  }

  return environments
}

const filenameRegex = /^[\w\-.]+$/

/**
 * Validate an environment name.
 */
const isValidName = (name: string, config: GlobalOptions, allowEmpty = false) => {
  const existing = getEnvironments(config, allowEmpty).map(({ name }) => name)

  // Validate uniqueness.
  if (existing.some((environment) => environment === name)) {
    return `must be different then existing environments (${existing.join(', ')})`
  }

  // Validate format.
  if (!name.match(filenameRegex)) {
    return `must be a valid name (${filenameRegex})`
  }

  return true
}

/**
 * Create a new environment file based on the template file.
 */
const createEnviroment = (name: string, config: GlobalOptions) => {
  const validationResult = isValidName(name, config, true)

  if (validationResult !== true) {
    throw new Error(`Invalid environment name: ${validationResult}`)
  }

  const filePath = path.resolve(config.cwd, config.environments.replace('[name]', name))

  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, readTemplate(config).replace('[name]', name), 'utf-8')
}

export {
  getEnvironments,
  getEnvironmentsPattern,
  createEnviroment,
  isValidName,
  defaultTemplate,
  templateExists,
  createTemplate,
  readTemplate,
}
