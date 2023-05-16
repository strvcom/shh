import fs from 'fs'
import dotenv from 'dotenv'
import inquirer from 'inquirer'
import { Command } from 'commander'

import { log } from '../lib/utils'
import { initConfig, addConfigOptions } from '../lib/config'
import type { EnvsConfig } from '../lib/config'
import {
  createEnviroment,
  getEnvironments,
  isValidName,
  readTemplate,
  templateExists,
} from '../lib/environments'
import path from 'path'

type Options = Partial<EnvsConfig> & {
  environment?: string
}

interface Comparison {
  name: string
  variables: Record<string, string>
}

interface Diff {
  [name: string]: {
    [variable: string]: 'x' | '<empty>'
  }
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
 * Command to compare existing environment variables and their existing keys.
 */
const command = new Command()
  .name('diff')
  .description('Compare environments existing keys.')
  .action(async () => {
    const options = command.optsWithGlobals<Options>()
    const config = initConfig(options)
    const environments = getEnvironments(config, true)

    if (!environments.length) {
      console.log(`No environment found at ${config.environments}. Aborting.`)
      return
    }

    const comparison: Comparison[] = []

    // Include template if existing.
    if (templateExists(config)) {
      comparison.push({
        name: 'template',
        variables: dotenv.parse(readTemplate(config)),
      })
    }

    // Include all environment files.
    for (const { name, file } of environments) {
      comparison.push({
        name,
        variables: dotenv.parse(fs.readFileSync(file)),
      })
    }

    const allVariables = comparison
      .reduce((carry, { variables }) => carry.concat(Object.keys(variables)), [] as string[])
      .filter((name, i, arr) => arr.indexOf(name) === i)
      .sort()

    let shouldWarn = false
    const diff: Diff = {}

    for (const { name, variables } of comparison) {
      diff[name] = {}

      for (const variable of allVariables) {
        if (!(variable in variables)) {
          shouldWarn = true
          continue
        }

        if (variable in variables) {
          const isEmpty = !Boolean(variables[variable])

          shouldWarn = shouldWarn || isEmpty

          diff[name][variable] = isEmpty ? '<empty>' : 'x'
        }
      }
    }

    console.table(diff)

    if (shouldWarn) {
      console.log('WARNING: There are either diverging variables or empty variables in some files.')
    }
  })

addConfigOptions(command)

export { command }
