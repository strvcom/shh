import { Command } from 'commander'
import inquirer from 'inquirer'

import { initConfig, addConfigOptions } from '../lib/config'
import * as gitCrypt from '../lib/git-crypt'

/**
 * Locks the repository and unninstall git-crypt.
 */
const command = new Command()
  .name('lock')
  .description('Locks the repository.')
  .action(async () => {
    const config = initConfig(command.optsWithGlobals())

    if (!(await gitCrypt.isConfigured(config))) {
      throw new Error('Repository is not locked or not configured with @strv/shh!')
    }

    if (config.logLevel === 'log') {
      const confirmed = (
        await inquirer.prompt([
          {
            name: 'confirmed',
            type: 'confirm',
            default: false,
            message:
              "WARNING: Are you sure you want to lock the repository? You'll need the exported key in order to unlock it and read environment files again.",
          },
        ])
      ).confirmed as boolean

      if (!confirmed) {
        process.exit(1)
      }
    }

    await gitCrypt.lock()
  })

addConfigOptions(command)

export { command }
