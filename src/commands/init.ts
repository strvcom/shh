import { Command } from 'commander'
import inquirer, { Question } from 'inquirer'

import { log } from '../lib/utils'
import { configOptions, initConfig, addConfigOptions, writeConfig } from '../lib/config'
import type { EnvsConfig } from '../lib/config'
import { templateExists, createTemplate } from '../lib/environments'

type Options = Partial<EnvsConfig>

/**
 * Build inquirer questions based on passed-in params.
 */
const getQuestions = (options: Options) => {
  const initials = initConfig({})
  const questions: Question[] = []

  if (!options.copy) {
    questions.push({
      name: 'copy',
      type: 'confirm',
      default: initials.copy,
      message: configOptions.copy.description,
    })
  }

  if (!options.target) {
    questions.push({
      name: 'target',
      type: 'string',
      default: initials.target,
      message: configOptions.target.description,
    })
  }

  if (!options.template) {
    questions.push({
      name: 'template',
      type: 'string',
      default: initials.template,
      message: configOptions.target.description,
    })
  }

  if (!options.environments) {
    questions.push({
      name: 'environments',
      type: 'string',
      default: initials.environments,
      message: configOptions.environments.description,
    })
  }

  if (!options.key) {
    questions.push({
      name: 'shouldEncrypt',
      type: 'confirm',
      default: true,
      message: 'Should we initialize environment files encryption?',
    })

    questions.push({
      name: 'key',
      type: 'string',
      default: initials.key,
      message: configOptions.key.description,
      when: (answers) => answers.shouldEncrypt,
    })
  }

  questions.push({
    name: 'createTemplate',
    type: 'confirm',
    default: false,
    message: 'No environment template found. Should we create one?',
    when: (answers) => !templateExists({ ...initials, ...answers }),
  })

  // Add form length status.
  for (let i = 0; i < questions.length; i++) {
    questions[i].message = `(${i + 1}/${questions.length}) ${questions[i].message}`
  }

  return questions
}

/**
 * Command to initialize configuration file.
 */
const command = new Command()
  .name('init')
  .description('Initialize .shhrc config file and install necessary codebase changes.')
  .action(async () => {
    const options = command.optsWithGlobals()
    const questions = getQuestions(options)
    const input = questions.length ? await inquirer.prompt(questions, options) : {}
    const config = initConfig({ ...options, ...input })

    // 1. Create .shhrc
    await log('Creating .shhrc')
    await writeConfig(config)
    await log('Creating .shhrc: ok')

    // 2. Optionally create template file.
    if (input.createTemplate) {
      await log(`Creating ${config.template}`)
      await createTemplate(config)
      await log(`Creating ${config.template}: ok`)
    }
  })

addConfigOptions(command)

export { command }
