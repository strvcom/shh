import fs from 'fs'
import dotenv from 'dotenv'
import { Command } from 'commander'

import { initConfig, addConfigOptions } from '../lib/config'
import type { EnvsConfig } from '../lib/config'
import { getEnvironments, readTemplate, templateExists } from '../lib/environments'

type Options = Partial<EnvsConfig> & {
  onlyWarnings?: string
}

interface ParsedEnvironment {
  name: string
  variables: Record<string, string>
}

interface Diff {
  [name: string]: {
    [variable: string]: 'empty' | 'missing'
  }
}

/**
 * Command to compare existing environment variables and their existing keys.
 */
const command = new Command()
  .name('diff')
  .option('--only-warnings', 'Whether only missing/empty variables should be listed', false)
  .description('Compare environments existing keys.')
  .action(async () => {
    const options = command.optsWithGlobals<Options>()
    const config = initConfig(options)
    const environments = getEnvironments(config, true)

    if (!environments.length) {
      console.log(`No environment found at ${config.environments}. Aborting.`)
      return
    }

    const parsed: ParsedEnvironment[] = []

    // Include template if existing.
    if (templateExists(config)) {
      parsed.push({
        name: 'template',
        variables: dotenv.parse(readTemplate(config)),
      })
    }

    // Include all environment files.
    for (const { name, file } of environments) {
      parsed.push({
        name,
        variables: dotenv.parse(fs.readFileSync(file)),
      })
    }

    const allVariables = parsed
      .reduce((carry, { variables }) => carry.concat(Object.keys(variables)), [] as string[])
      .filter((name, i, arr) => arr.indexOf(name) === i)
      .sort()

    const warnings: string[] = []
    const diff: Diff = {}

    for (const { name, variables } of parsed) {
      diff[name] = {}

      for (const variable of allVariables) {
        const missing = !(variable in variables)
        const filled = !missing && Boolean(variables[variable])
        const state = missing ? 'missing' : filled ? 'ok' : 'empty'

        if (state !== 'ok') {
          diff[name][variable] = state

          warnings.push(variable)
        }
      }
    }

    const columns = config.onlyWarnings ? warnings : allVariables

    if (columns.length) {
      console.table(diff, columns)
    }

    if (warnings.length) {
      console.warn(
        'WARNING: There are either diverging variables or empty variables in some files.'
      )
    } else {
      console.log('All good!')
    }
  })

addConfigOptions(command)

export { command }
