import fs from 'fs'
import path from 'path'
import { Command } from 'commander'
import inquirer from 'inquirer'

import { createLogger } from '../lib/utils'
import { initConfig, addConfigOptions } from '../lib/config'
import type { ShhConfig } from '../lib/config'
import { getEnvironments } from '../lib/environments'
import { Environment } from '../lib/environments'
import { unlock } from '../lib/git-crypt'

type Options = Partial<ShhConfig> & {
  environment?: string
}

/**
 * Inquire environment.
 */
const selectEnvironment = async (environments: Environment[]) =>
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

/**
 * Main command to install a environment.
 */
const command = new Command()
  .allowExcessArguments(false)
  .option('-e, --environment <name>', 'The environment to install')
  .action(async (options: Options) => {
    const config = initConfig(options)
    const environments = getEnvironments(config)
    const selected = config.environment ?? (await selectEnvironment(environments))
    const environment = environments.find(({ name }) => name === selected)

    if (!environment) {
      throw new Error(`File inexistant for environment "${selected}".`)
    }

    const paths = {
      source: environment.file,
      target: path.resolve(config.cwd, config.target),
    }

    if (paths.target.includes('*')) {
      throw new Error(`Invalid target env file path: "${paths.target}"`)
    }

    await log(`Creating ${config.target} symlink to ${environment.relative}`)

    try {
      // Ensure it's clear.`
      fs.rmSync(paths.target, { force: true })

      // Install env file.
      config.copy
        ? fs.copyFileSync(paths.source, paths.target)
        : fs.symlinkSync(paths.source, paths.target)
    } catch (err) {
      console.error(err)
      throw new Error(`Failed creating ${config.target} symlink to ${environment.relative}`)
    }

    await log(`Creating ${config.target} symlink to ${environment.relative}: ok`)
  })

addConfigOptions(command)

export { command }
