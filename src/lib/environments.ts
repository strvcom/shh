import fs from 'fs'
import path from 'path'
import { globSync } from 'glob'

import type { EnvsConfig } from './config'

export interface Environment {
  file: string
  name: string
  relative: string
}

const defaultTemplate = '# Environment: [name]\n'

/**
 * Read the template file.
 */
const readTemplate = (config: EnvsConfig) => {
  const filePath = path.resolve(config.cwd, config.template)

  return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf-8') : defaultTemplate
}

/**
 * Resolve environment paths and their names.
 */
const getEnvironments = (config: EnvsConfig, allowEmpty = false): Environment[] => {
  const pattern = config.environments.replace('[name]', '*')

  const regex = new RegExp(
    `^${path
      .resolve(config.cwd, config.environments)
      .replace('**', '.+')
      .replace('*', '[^ /]+')
      .replace('[name]', '(?<name>[a-zA-Z0-9]+)')}$`
  )

  const environments = globSync(pattern, { cwd: config.cwd, absolute: true }).map((file) => {
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

export { getEnvironments, createEnviroment, isValidName }
