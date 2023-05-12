import { Command } from 'commander'
import { globSync } from 'glob'
import log from 'log-update'
import inquirer from 'inquirer'

import { getConfig, SecrecyConfig } from '../lib/config'
import path from 'path'

interface Options {
  secret: string
  environment: string
}

/**
 * Resolve environment paths and their names.
 */
const getEnvironments = (config: SecrecyConfig) => {
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

    return { file, name }
  })

  return environments
}

/**
 * Inquire environment.
 */
const selectEnvironment = async (environments: ReturnType<typeof getEnvironments>) =>
  (
    await inquirer.prompt([
      {
        name: 'environment',
        type: 'list',
        message: 'Select the environment to install',
        choices: environments.map(({ name }) => name),
      },
    ])
  ).environment as string

// Declare the command-line program.
const command = new Command()
  .option('-s, --secret <path>', 'The path to the secret file')
  .option('-e, --environment <name>', 'The environment to install')
  .action(async (options: Options) => {
    const config = getConfig(options)
    const environments = getEnvironments(config)
    const selected = config.environment ?? (await selectEnvironment(environments))
    const environment = environments.find(({ name }) => name === selected)

    if (!environment) {
      throw new Error(`File inexistant for environment "${selected}".`)
    }
  })

export { command }
