import fs from 'fs'
import path from 'path'
import { globSync } from 'glob'
import inquirer from 'inquirer'

import type { EnvsConfig } from './config'

export interface Environment {
  file: string
  name: string
  relative: string
}

const defaultTemplate = '# Environment: [name]\n'

/**
 * Check if a template file exists.
 */
const templateExists = (config: EnvsConfig) =>
  fs.existsSync(path.resolve(config.cwd, config.template))

/**
 * Read the template file.
 */
const readTemplate = (config: EnvsConfig) =>
  templateExists(config)
    ? fs.readFileSync(path.resolve(config.cwd, config.template), 'utf-8')
    : defaultTemplate

/**
 * Create template file.
 */
const createTemplate = async (config: EnvsConfig) => {
  const { content } = await inquirer.prompt([
    {
      name: 'content',
      type: 'editor',
      default: defaultTemplate,
      message: 'Edit the environment template file content',
    },
  ])

  fs.writeFileSync(path.resolve(config.cwd, config.template), content, 'utf-8')
}

/**
 * Translate environments pattern into glob pattern.
 */
const getEnvironmentsPattern = (config: EnvsConfig) => config.environments.replace('[name]', '*')

/**
 * Resolve environment paths and their names.
 */
const getEnvironments = (config: EnvsConfig, allowEmpty = false): Environment[] => {
  const pattern = getEnvironmentsPattern(config)

  const regex = new RegExp(
    `^${path
      .resolve(config.cwd, config.environments)
      .replace('**', '.+')
      .replace('*', '[^ /]+')
      .replace('[name]', '(?<name>[a-zA-Z0-9]+)')}$`
  )

  const environments = globSync(pattern, { cwd: config.cwd, absolute: true })
    // Ignore key file.
    .filter((file) => !file.endsWith(config.encryptionKey))
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
    throw new Error(`No environment found at "${config.environments}"`)
  }

  return environments
}

const filenameRegex = /^[\w\-.]+$/

/**
 * Validate an environment name.
 */
const isValidName = (name: string, config: EnvsConfig) => {
  const existing = getEnvironments(config).map(({ name }) => name)

  // Validate uniqueness.
  if (existing.some((environment) => environment === name)) {
    return `Must be different then existing environments (${existing.join(', ')})`
  }

  // Validate format.
  if (!name.match(filenameRegex)) {
    return `Must be a valid name (${filenameRegex})`
  }

  return true
}

/**
 * Create a new environment file based on the template file.
 */
const createEnviroment = (name: string, config: EnvsConfig) => {
  const validationResult = isValidName(name, config)

  if (validationResult !== true) {
    console.log(`Validation error: ${validationResult}`)
    throw new Error('Invalid environment name')
  }

  const filePath = path.resolve(config.cwd, config.environments.replace('[name]', name))

  fs.writeFileSync(filePath, readTemplate(config).replace('[name]', name), 'utf-8')
}

export {
  getEnvironments,
  getEnvironmentsPattern,
  createEnviroment,
  isValidName,
  templateExists,
  createTemplate,
}
