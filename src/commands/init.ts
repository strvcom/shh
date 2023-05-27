import { Command } from 'commander'
import inquirer from 'inquirer'
import { Question } from 'inquirer'

import { createLogger } from '../lib/utils'
import { initConfig, addConfigOptions, writeConfig, GlobalOptions } from '../lib/config'
import {
  templateExists,
  createTemplate,
  getEnvironments,
  isValidName,
  defaultTemplate,
  createEnviroment,
} from '../lib/environments'
import * as gitCrypt from '../lib/git-crypt'

type Answers = {
  shouldCreateTemplate: boolean
  templateContent: string
  shouldCreateEnvironments: boolean
  environments: string[]
}

/**
 * Build inquirer questions based on passed-in params.
 */
const getInput = async (config: GlobalOptions): Promise<Answers> => {
  const questions: Question<Answers>[] = []
  const environment = getEnvironments(config, true)

  if (!templateExists(config)) {
    questions.push({
      name: 'shouldCreateTemplate',
      type: 'confirm',
      default: true,
      message: 'No environment template found. Should we create one?',
    })

    questions.push({
      name: 'templateContent',
      type: 'editor',
      default: defaultTemplate,
      message: 'Edit the environment template content',
      when: (answers) => answers.shouldCreateTemplate,
    })
  }

  if (!environment.length) {
    questions.push({
      name: 'shouldCreateEnvironments',
      type: 'confirm',
      default: true,
      message: `No environments found  at "${config.environments}". Do you wanna create some?`,
    })

    questions.push({
      name: 'environments',
      type: 'input',
      default: 'development,production',
      message: 'List environment names, separated commas:',
      when: (answers) => answers.shouldCreateEnvironments,

      filter: (input: string) =>
        input
          .split(',')
          .map((name) => name.trim())
          .filter((name, i, names) => names.indexOf(name) === i),

      validate: (names: string[]) =>
        names.reduce(
          (carry, name) => (carry === true ? isValidName(name, config, true) : carry),
          true as boolean | string
        ),
    })
  }

  // Add form length status.
  for (let i = 0; i < questions.length; i++) {
    questions[i].message = `(${i + 1}/${questions.length}) ${questions[i].message}`
  }

  return config.logLevel === 'log' && questions.length
    ? ((await inquirer.prompt(questions)) as Answers)
    : {
        shouldCreateTemplate: false,
        templateContent: '',
        shouldCreateEnvironments: false,
        environments: [],
      }
}

/**
 * Command to initialize configuration file.
 */
const command = new Command()
  .name('init')
  .description('Initialize .shhrc config file and install necessary codebase changes.')
  .action(async () => {
    let created = false

    const options = command.optsWithGlobals()
    const config = initConfig(options)
    const logger = createLogger(config)
    const input = await getInput(config)

    // 1. Configure git-crypt
    if (config.encrypt) {
      // 4. Configure git-crypt.
      await logger.log('Configuring git-crypt')
      await gitCrypt.configure(config)
      await logger.log('Configuring git-crypt: ok', true)
    }

    // 2. Create .shhrc
    await logger.log('Creating .shhrc')
    created = await writeConfig(config)
    await logger.log(`Creating .shhrc: ${created ? 'ok' : 'skipped'}`, true)

    // 3. Optionally create template file.
    if (input.shouldCreateTemplate) {
      await logger.log(`Creating ${config.template}`)
      await createTemplate(config, input.templateContent)
      await logger.log(`Creating ${config.template}: ok`, true)
    }

    // 4. Optionally create environment files.
    if (input.shouldCreateEnvironments) {
      await logger.log(`Creating environments`)

      for (const name of input.environments) {
        await logger.log(`Creating environments: ${name}`)
        await createEnviroment(name, config)
      }

      await logger.log(`Creating environments: ok`, true)
    }
  })

addConfigOptions(command)

export { command }
