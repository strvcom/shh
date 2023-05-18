// @ts-ignore
import pkg from '../package.json'

import { initConfig } from './lib/config'
import type { GlobalOptions } from './lib/config'
import * as gitCrypt from './lib/git-crypt'

import { command as program } from './commands/main'
import { command as init } from './commands/init'
import { command as newEnvironment } from './commands/new'
import { command as diff } from './commands/diff'
import { command as exportKey } from './commands/export-key'

program
  // Declare program meta.
  .name(pkg.name)
  .description(pkg.description)
  .version(pkg.version)

  .hook('preAction', async (command) => {
    const options = command.optsWithGlobals()
    const config = initConfig(options)

    if (config.encrypt && !gitCrypt.checkAvailability()) {
      throw new Error('git-crypt not installed')
    }
  })

  // Register sub-commands.
  .addCommand(init)
  .addCommand(newEnvironment)
  .addCommand(diff)
  .addCommand(exportKey)

  // Execute.
  .parseAsync(process.argv)

  // Obfuscate errors on silent mode.
  .catch((err) =>
    program.optsWithGlobals<GlobalOptions>().logLevel === 'nothing'
      ? process.exit(1)
      : Promise.reject(err)
  )
