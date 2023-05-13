#!/usr/bin/env node

// @ts-ignore
import pkg from '../package.json'

import { command as program } from './commands/main'
import { command as init } from './commands/init'
import { command as newEnvironment } from './commands/new'

program
  // Declare program meta.
  .name(pkg.name)
  .description(pkg.description)
  .version(pkg.version)

  // Register sub-commands.
  .addCommand(init)
  .addCommand(newEnvironment)

  // Execute.
  .parse(process.argv)
