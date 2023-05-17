import { Command } from 'commander'
import inquirer from 'inquirer'

import { createLogger } from '../lib/utils'
import { initConfig, addConfigOptions } from '../lib/config'
import type { GlobalOptions } from '../lib/config'
import { createEnviroment, isValidName } from '../lib/environments'
import path from 'path'

type Options = Partial<GlobalOptions> & {
  environment?: string
}

/**
 * Prompt environment name.
 */
const promptEnvironment = async (config: GlobalOptions) =>
  (
    await inquirer.prompt([
      {
        name: 'environment',
        type: 'input',
        message: 'Give the new environment a name',
        validate: (input) => isValidName(input, config, true),
      },
    ])
  ).environment as string

/**
 * Command to create a new environment file.
 */
const command = new Command()
  .name('new')
  .description('Create a new environment file.')
  .option('-e, --environment <name>', 'The name of the environment.')
  .action(async () => {
    const options = command.optsWithGlobals<Options>()
    const config = initConfig(options)
    const logger = createLogger(config)
    const environment = config.environment ?? (await promptEnvironment(config))
    const file = path.resolve(config.cwd, config.environments.replace('[name]', environment))

    await logger.log(`Creating environment ${environment} at ${file}`)
    createEnviroment(environment, config)
    await logger.log(`Creating environment ${environment}: ok`, true)
  })

addConfigOptions(command)

export { command }
