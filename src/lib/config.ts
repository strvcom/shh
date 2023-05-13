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
  command
    .option('-c, --copy', 'Install environment using a copy instead of symlink')
    .option('-s, --secret <path>', 'The path to the git-crypt secret file')
    .option('-t, --target <path>', 'The path to the managed env file')
    .option('-E, --environments <path>', 'The path pattern to the environment files')
    .option('--cwd <path>', 'The root of the application')

/**
 * Load the config file and merge with defaults and overrides.
 */
const initConfig = <Override extends Partial<SecrecyConfig>>(override: Override) => {
  const root = override.cwd || process.cwd()
  const configPath = path.resolve(root, '.secrecyrc')

  const config: Omit<Partial<SecrecyConfig>, 'root'> = fs.existsSync(configPath)
    ? JSON.parse(fs.readFileSync(configPath, 'utf-8'))
    : {}

  return { ...defaults, ...config, ...override, cwd: root }
}

export { initConfig, defaults, addConfigOptions }
export type { SecrecyConfig }
