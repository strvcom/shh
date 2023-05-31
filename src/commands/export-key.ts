import { Command } from 'commander'
import { stdout } from 'process'

import { initConfig, addConfigOptions } from '../lib/config'
import * as gitCrypt from '../lib/git-crypt'
import { errors } from '../lib/errors'

/**
 * Command to create a new environment file.
 */
const command = new Command()
  .name('export-key')
  .description('Export the symetric key')
  .action(async () => {
    const config = initConfig(command.optsWithGlobals())

    // Ensure we are at "ready" status.
    await gitCrypt.invariantStatus(config, {
      empty: errors.notConfigured,
      locked: errors.locked,
    })

    stdout.write(gitCrypt.getKey(config))
  })

addConfigOptions(command)

export { command }
