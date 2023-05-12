// @ts-ignore
import pkg from '../package.json'

import { command as main } from './commands/main'

const program = main
  // Declare program meta.
  .name(pkg.name)
  .description(pkg.description)
  .version(pkg.version)

// Execute.
program.parse(process.argv)
