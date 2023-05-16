import { execSync } from 'child_process'
import { Command } from 'commander'
import inquirer from 'inquirer'
import { Question, ListQuestion } from 'inquirer'

import { log } from '../lib/utils'
import { configOptions, initConfig, addConfigOptions, writeConfig } from '../lib/config'
import type { EnvsConfig } from '../lib/config'
import { templateExists, createTemplate } from '../lib/environments'
import * as gitCrypt from '../lib/git-crypt'

type Options = Partial<EnvsConfig>

type Answers = Options & {
  shouldCreateTemplate: boolean
  gitAction: 'skip' | 'stage' | 'commit'
}

/**
 * Build inquirer questions based on passed-in params.
 */
const getQuestions = (options: Options) => {
  const initials = initConfig({})
  const questions: Array<Question<Answers> | ListQuestion<Answers>> = []

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

  if (!options.shouldEncrypt) {
    questions.push({
      name: 'shouldEncrypt',
      type: 'confirm',
      default: initials.shouldEncrypt,
      message: configOptions.shouldEncrypt.description,
    })
  }

  if (!options.encryptionKey) {
    questions.push({
      name: 'encryptionKey',
      type: 'string',
      default: initials.encryptionKey,
      message: configOptions.encryptionKey.description,
      when: (answers) => !!answers.shouldEncrypt,
    })
  }

  questions.push({
    name: 'shouldCreateTemplate',
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
    const input = (questions.length ? await inquirer.prompt(questions, options) : {}) as Answers
    const config = initConfig({ ...options, ...input })

    // 1. Create .shhrc
    await log('Creating .shhrc')
    await writeConfig(config)
    await log('Creating .shhrc: ok', true)

    // 2. Optionally create template file.
    if (input.shouldCreateTemplate) {
      await log(`Creating ${config.template}`)
      await createTemplate(config)
      await log(`Creating ${config.template}: ok`, true)
    }

    if (config.shouldEncrypt) {
      await log('Checking git-crypt install')

      // 3. Verify if git-crypt is installed.
      if (!gitCrypt.checkAvailability()) {
        await log('Checking git-crypt install: fail', true)
        throw new Error('git-crypt not found. Check README.md for instructions.')
      }

      await log('Checking git-crypt install: ok', true)

      // 4. Configure git-crypt.
      await log('Configuring git-crypt')
      await gitCrypt.configure(config)
      await log('Configuring git-crypt: ok', true)
    }
  })

addConfigOptions(command)

export { command }
