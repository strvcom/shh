import fs from 'fs'
import path from 'path'
import { Command } from 'commander'
import inquirer from 'inquirer'

import { createLogger } from '../lib/utils'
import { initConfig, addConfigOptions } from '../lib/config'
import type { GlobalOptions } from '../lib/config'
import { getEnvironments } from '../lib/environments'
import * as gitCrypt from '../lib/git-crypt'
import { errors } from '../lib/errors'

type Config = GlobalOptions & {
  environment?: string
}

/**
 * Inquire environment.
 */
const ensureEnvironment = async (config: Config) => {
  let selected = config.environment as string
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
    throw errors.environment.fileNotFound(selected)
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
    const config = initConfig(command.optsWithGlobals<Config>())
    const logger = createLogger(config)

    // Ensure we are at "ready" status.
    gitCrypt.invariantStatus(config, {
      empty: errors.notConfigured,
      locked: errors.locked,
    })

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
      throw errors.symlink(config.target, environment.relative)
    }

    await logger.log(`Installing ${environment.name}: ok`, true)
  })

addConfigOptions(command)

export { command }
