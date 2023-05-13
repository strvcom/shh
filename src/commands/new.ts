import { Command } from 'commander'
import inquirer from 'inquirer'

import { log } from '../lib/utils'
import { initConfig, addConfigOptions } from '../lib/config'
import type { EnvsConfig } from '../lib/config'
import { createEnviroment, isValidName } from '../lib/environments'
import path from 'path'

type Options = Partial<EnvsConfig> & {
  environment?: string
}

/**
 * Prompt environment name.
 */
const promptEnvironment = async (config: EnvsConfig) =>
  (
    await inquirer.prompt([
      {
        name: 'environment',
        type: 'input',
        message: 'Give the new environment a name',
        validate: (input) => isValidName(input, config),
      },
    ])
  ).environment as string

/**
 * Command to create a new environment file.
 */
const command = new Command()
  .name('new')
  .description('Create a new environment file based on the template.')
  .option('-e, --environment <name>', 'The name of the environment.')
  .action(async () => {
    const options = command.optsWithGlobals<Options>()
    const config = initConfig(options)
    const environment = config.environment ?? (await promptEnvironment(config))
    const file = path.resolve(config.cwd, config.environments.replace('[name]', environment))

    await log(`Creating environment ${environment} at ${file}`)
    createEnviroment(environment, config)
    await log(`Creating environment ${environment}: ok`)
  })

addConfigOptions(command)

export { command }
