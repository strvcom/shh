import { Command } from 'commander'
import fs from 'fs'
import path from 'path'

interface SecrecyConfig {
  /**
   * Install environment using a copy instead of symlink.
   */
  copy: boolean

  /**
   * The path to the git-crypt secret file.
   */
  secret: string

  /**
   * The path to the managed env file.
   */
  target: string

  /**
   * The path pattern to the environment files.
   */
  environments: string

  /**
   * The root of the application.
   */
  cwd: string
}

// prettier-ignore
const configOptions = {
  copy: { flags: '-c, --copy', description: 'Install environment using a copy instead of symlink' },
  secret: { flags: '-s, --secret <path>', description: 'The path to the git-crypt secret file' },
  target: { flags: '-t, --target <path>', description: 'The path to the managed env file' },
  environments: { flags: '-E, --environments <path>', description: 'The path pattern to the environment files' },
  cwd: { flags: '--cwd <path>', description: 'The root of the application' },
}

const defaults: SecrecyConfig = {
  copy: false,
  target: '.env',
  secret: './env/secret',
  environments: './env/.env.encrypted.[name]',
  cwd: process.cwd(),
}

/**
 * Apply common options to to a command.
 */
const addConfigOptions = (command: Command) =>
  Object.values(configOptions).reduce(
    (command, { flags, description }) => command.option(flags, description),
    command
  )

/**
 * Read the .secrecyrc config file.
 */
const readConfig = (options?: Partial<SecrecyConfig>): Partial<SecrecyConfig> => {
  const root = options?.cwd ?? process.cwd()
  const configPath = path.resolve(root, '.secrecyrc')

  return fs.existsSync(configPath) ? JSON.parse(fs.readFileSync(configPath, 'utf-8')) : {}
}

/**
 * Write the .secrecyrc config file.
 */
const writeConfig = ({ cwd, ...options }: Partial<SecrecyConfig>) => {
  const root = cwd ?? process.cwd()
  const configPath = path.resolve(root, '.secrecyrc')

  fs.writeFileSync(configPath, JSON.stringify(options, null, 2), 'utf-8')
}

/**
 * Load the config file and merge with defaults and overrides.
 */
const initConfig = <Override extends Partial<SecrecyConfig>>(override: Override) => ({
  ...defaults,
  ...readConfig(override),
  ...override,
})

export { configOptions, initConfig, readConfig, writeConfig, addConfigOptions }
export type { SecrecyConfig }
