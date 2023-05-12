import { Command } from 'commander'

import { getConfig } from '../lib/config'

interface Options {
  secret: string
  environment: string
}

// Declare the command-line program.
const command = new Command()
  .option('-s, --secret <path>', 'The path to the secret file')
  .option('-e, --environment <name>', 'The environment to install')
  .action(function (this: Command, options: Options) {
    const config = getConfig(options)

    console.log({ config })
  })

export { command }
