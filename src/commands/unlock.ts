import { Command } from 'commander'

import { initConfig, addConfigOptions } from '../lib/config'
import * as gitCrypt from '../lib/git-crypt'

/**
 * Unlocks the repository.
 */
const command = new Command()
  .name('unlock')
  .description('Unlocks the repository.')
  .option('-k, --encoded-key <key>', 'The base64 encoded key')
  .action(async () => {
    const config = initConfig(command.optsWithGlobals())

    if (await gitCrypt.isConfigured(config)) {
      throw new Error('Repository already unlocked!')
    }

    await gitCrypt.unlock(config)
  })

addConfigOptions(command)

export { command }
