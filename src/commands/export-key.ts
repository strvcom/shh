import { Command } from 'commander'

import { initConfig, addConfigOptions } from '../lib/config'
import { getKey, getStatus } from '../lib/git-crypt'

/**
 * Command to create a new environment file.
 */
const command = new Command()
  .name('export-key')
  .description('Export the symetric key')
  .action(async () => {
    const config = initConfig(command.optsWithGlobals())
    const status = await getStatus(config)

    // A. Not configured.
    if (status === 'empty') {
      throw new Error('Shh not installed. Please, run `shh init`')
    }

    // B. Installed, locked.
    if (status === 'locked') {
      throw new Error('Repository is locked. Please, run `shh` to unlock')
    }

    console.log(getKey(config))
  })

addConfigOptions(command)

export { command }
