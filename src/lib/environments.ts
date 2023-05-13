import path from 'path'
import { globSync } from 'glob'

import type { EnvsConfig } from './config'

export interface Environment {
  file: string
  name: string
  relative: string
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

export { getEnvironments }
