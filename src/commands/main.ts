import fs from 'fs'
import path from 'path'
import { Command } from 'commander'
import inquirer from 'inquirer'

import { createLogger } from '../lib/utils'
import { initConfig, addConfigOptions } from '../lib/config'
import type { GlobalOptions } from '../lib/config'
import { getEnvironments } from '../lib/environments'
import * as gitCrypt from '../lib/git-crypt'

type Config = GlobalOptions & {
  environment?: string
}

/**
 * Inquire environment.
 */
const ensureEnvironment = async (config: Config) => {
  let selected = config.environment
  const environments = getEnvironments(config)

  // Prompt environment name if possible.
  if (!selected && config.logLevel === 'log') {
    selected = (
      await inquirer.prompt([
        {
          name: 'environment',
          type: 'list',
          message: 'Select the environment to install',
          choices: environments.map(({ name }) => name),
        },
      ])
    ).environment as string
  }

  const environment = environments.find(({ name }) => name === selected)

  if (!environment) {
    throw new Error(`File not found for environment "${selected}".`)
  }

  return environment
}

/**
 * Main command to install a environment.
 */
const command = new Command()
  .allowExcessArguments(false)
  .option('-e, --environment <name>', 'The environment to install')
  .option('-k, --encoded-key <key>', 'The base64 encoded key')
  .action(async () => {
    const options = command.optsWithGlobals<Config>()
    const config = initConfig(options)
    const logger = createLogger(config)

    if (config.encrypt && !(await gitCrypt.isConfigured(config))) {
      throw new Error('Repository is locked. Run `shh unlock` to unlock.')
    }

    const environment = await ensureEnvironment(config)

    const paths = {
      source: environment.file,
      target: path.resolve(config.cwd, config.target),
    }

    // Safe-guard against general exploitation of globs.
    if (paths.target.includes('*')) {
      throw new Error(`Invalid target env file path: "${paths.target}"`)
    }

    await logger.log(`Installing ${environment.name}`)

    try {
      // 1. Ensure target is clear.
      fs.rmSync(paths.target, { force: true })

      // 2. Install env file.
      config.copy
        ? fs.copyFileSync(paths.source, paths.target)
        : fs.symlinkSync(paths.source, paths.target)
    } catch (err) {
      logger.error(err)
      throw new Error(`Failed creating ${config.target} symlink to ${environment.relative}`)
    }

    await logger.log(`Installing ${environment.name}: ok`, true)
  })

addConfigOptions(command)

export { command }
