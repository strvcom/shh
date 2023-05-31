import { Command } from 'commander'
import inquirer from 'inquirer'

import { initConfig, addConfigOptions, GlobalOptions } from '../lib/config'
import * as gitCrypt from '../lib/git-crypt'
import { errors } from '../lib/errors'

type Options = GlobalOptions & {
  yes?: boolean
}

/**
 * Locks the repository and unninstall git-crypt.
 */
const command = new Command()
  .name('lock')
  .description('Locks the repository.')
  .option('-y, --yes', 'Confirm YES to warning prompts.')
  .action(async () => {
    const config = initConfig<Options>(command.optsWithGlobals())

    // Ensure we are at "ready" status.
    gitCrypt.invariantStatus(config, {
      empty: errors.notConfigured,
      locked: errors.locked,
    })

    if (config.logLevel === 'log' && !config.yes) {
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
