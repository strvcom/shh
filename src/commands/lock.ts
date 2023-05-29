import { Command } from 'commander'

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
      throw new Error('Repository is not configured with @strv/shh!')
    }

    await gitCrypt.lock(config)
  })

addConfigOptions(command)

export { command }
