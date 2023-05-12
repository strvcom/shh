import { Command } from 'commander'
// @ts-ignore
import pkg from '../package.json'

// Declare the command-line program.
const program = new Command().name(pkg.name).description(pkg.description).version(pkg.version)

// Execute.
program.parse(process.argv)
