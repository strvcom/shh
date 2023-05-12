import fs from 'fs'
import path from 'path'
import { Command } from 'commander'
import { globSync } from 'glob'
import log from 'log-update'
import inquirer from 'inquirer'

import { getConfig, SecrecyConfig } from '../lib/config'
import { checkGitCryptInstall, checkSecretFile } from '../lib/check'

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

    return { file, name, relative: path.relative(config.cwd, file) }
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
  .option('-c, --copy', 'Copy env file instead of symlinking it')
  .option('-t, --target <path>', 'The path to the managed env target')
  .action(async (options: Options) => {
    const config = getConfig(options)
    const environments = getEnvironments(config)
    const selected = config.environment ?? (await selectEnvironment(environments))
    const environment = environments.find(({ name }) => name === selected)

    if (!environment) {
      throw new Error(`File inexistant for environment "${selected}".`)
    }

    checkGitCryptInstall()
    checkSecretFile(config)

    const paths = {
      source: environment.file,
      target: path.resolve(config.cwd, config.target),
    }

    if (paths.target.includes('*')) {
      throw new Error(`Invalid target env file path: "${paths.target}"`)
    }

    log(`Creating ${config.target} symlink to ${environment.relative}`)

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

    log(`Creating ${config.target} symlink to ${environment.relative}: ok`)
  })

export { command }
