import { Command } from 'commander'
import inquirer from 'inquirer'

import { initConfig, addConfigOptions } from '../lib/config'
import * as gitCrypt from '../lib/git-crypt'
import { errors } from '../lib/errors'

/**
 * Unlocks the repository.
 */
const command = new Command()
  .name('unlock')
  .description('Unlocks the repository.')
  .option('-k, --encoded-key <key>', 'The base64 encoded key')
  .action(async () => {
    const config = initConfig(command.optsWithGlobals())

    // Ensure we are at "locked" status.
    gitCrypt.invariantStatus(config, {
      ready: errors.unlocked(),
      empty: errors.notConfigured(),
    })

    let encodedKey = process.env.SHH_KEY || config.encodedKey

    // Let use input on first usage on new clone.
    if (!encodedKey && config.logLevel === 'log') {
      encodedKey = (
        await inquirer.prompt([
          {
            name: 'key',
            type: 'input',
            message: 'Provide the shh key (run `shh export-key` to get one):',
            validate: gitCrypt.isValidKey,
          },
        ])
      ).key as string
    }

    await gitCrypt.unlock(encodedKey)
  })

addConfigOptions(command)

export { command }
