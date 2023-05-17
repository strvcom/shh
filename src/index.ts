// @ts-ignore
import pkg from '../package.json'

import { GlobalOptions } from './lib/config'
import { command as program } from './commands/main'
import { command as init } from './commands/init'
import { command as newEnvironment } from './commands/new'
import { command as diff } from './commands/diff'

program
  // Declare program meta.
  .name(pkg.name)
  .description(pkg.description)
  .version(pkg.version)

  // Register sub-commands.
  .addCommand(init)
  .addCommand(newEnvironment)
  .addCommand(diff)

  // Execute.
  .parseAsync(process.argv)

  // Obfuscate errors on silent mode.
  .catch((err) =>
    program.optsWithGlobals<GlobalOptions>().logLevel === 'nothing'
      ? process.exit(1)
      : Promise.reject(err)
  )
