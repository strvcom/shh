// @ts-ignore
import pkg from '../package.json'

import { initConfig } from './lib/config'
import type { GlobalOptions } from './lib/config'
import * as gitCrypt from './lib/git-crypt'

import { command as program } from './commands/main'
import { command as init } from './commands/init'
import { command as diff } from './commands/diff'
import { command as lock } from './commands/lock'
import { command as unlock } from './commands/unlock'
import { command as newEnvironment } from './commands/new'
import { command as exportKey } from './commands/export-key'

program
  // Declare program meta.
  .name('shh')
  .description(pkg.description)
  .version(pkg.version)
  .allowExcessArguments(false)

  .hook('preAction', async (command) => {
    const options = command.optsWithGlobals()
    const config = initConfig(options)

    if (config.encrypt && !gitCrypt.checkAvailability()) {
      throw new Error('git-crypt not installed')
    }
  })

  // Register sub-commands.
  .addCommand(init)
  .addCommand(diff)
  .addCommand(lock)
  .addCommand(unlock)
  .addCommand(newEnvironment)
  .addCommand(exportKey)

  // Execute.
  .parseAsync(process.argv)

  // Obfuscate errors on silent mode.
  .catch((err) => {
    if (program.optsWithGlobals<GlobalOptions>().logLevel !== 'nothing') {
      console.log('message' in err ? err.message : err)
    }

    process.exit(1)
  })
