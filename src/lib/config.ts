import fs from 'fs'
import path from 'path'

interface SecrecyConfig {
  /**
   * Path to the secret key.
   */
  secret: string

  /**
   * Path pattern to environment files.
   */
  environments: string

  /**
   * Resolved project root.
   */
  cwd: string
}

const defaults = {
  secret: './env/secret',
  environments: './env/.env.encrypted.[name]',
}

const getConfig = <Override extends {}>(override: Override) => {
  const root = process.cwd()
  const configPath = path.resolve(root, '.secrecyrc')

  const config: Omit<Partial<SecrecyConfig>, 'root'> = fs.existsSync(configPath)
    ? JSON.parse(fs.readFileSync(configPath, 'utf-8'))
    : {}

  return { ...defaults, ...config, ...override, cwd: root }
}

export { getConfig }
export type { SecrecyConfig }
