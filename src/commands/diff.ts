import fs from 'fs'
import dotenv from 'dotenv'
import { Command } from 'commander'

import { initConfig, addConfigOptions } from '../lib/config'
import type { ShhConfig } from '../lib/config'
import { getEnvironments, readTemplate, templateExists } from '../lib/environments'
import { createLogger } from '../lib/utils'

type Options = Partial<ShhConfig> & {
  onlyWarnings: boolean
}

interface ParsedEnvironment {
  name: string
  variables: Record<string, string>
}

interface Diff {
  [variable: string]: {
    [name: string]: '🟢' | '🟡' | '🔴'
  }
}

/**
 * Command to compare existing environment variables and their existing keys.
 */
const command = new Command()
  .name('diff')
  .description('Compare environments existing keys')
  .action(async () => {
    const config = initConfig(command.optsWithGlobals<Options>())
    const environments = getEnvironments(config, true)
    const logger = createLogger(config)

    if (!environments.length) {
      logger.log(`No environment found at ${config.environments}. Aborting.`, true)

      process.exit(1)
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

    for (const variable of allVariables) {
      diff[variable] = {}

      for (const { name, variables } of parsed) {
        const missing = !(variable in variables)
        const filled = !missing && Boolean(variables[variable])
        const state = missing ? '🔴' : filled ? '🟢' : '🟡'

        diff[variable][name] = state

        if (state === '🟢' || (name === 'template' && state === '🟡')) {
          continue
        }

        warnings.push(name)
      }
    }

    const columns = config.onlyWarnings ? warnings : parsed.map((env) => env.name)

    if (columns.length) {
      console.log('\n🟢 = variable set\n🟡 = variable empty\n🔴 = variable missing\n')
      console.table(diff, columns)
    }

    if (warnings.length) {
      logger.warn('WARNING: There are either diverging variables or empty variables in some files.')
    } else {
      logger.log('All good!', true)
    }
  })

addConfigOptions(command)

export { command }
