import { Command } from 'commander'
import inquirer from 'inquirer'
import { Question, ListQuestion } from 'inquirer'

import { createLogger } from '../lib/utils'
import { initConfig, addConfigOptions, writeConfig } from '../lib/config'
import type { ShhConfig } from '../lib/config'
import { templateExists, createTemplate } from '../lib/environments'
import * as gitCrypt from '../lib/git-crypt'

type Options = Partial<ShhConfig>

type Answers = Options & {
  shouldCreateTemplate: boolean
}

/**
 * Build inquirer questions based on passed-in params.
 */
const getQuestions = () => {
  const initials = initConfig({})
  const questions: Array<Question<Answers> | ListQuestion<Answers>> = []

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
    let created = false

    const options = command.optsWithGlobals()
    const questions = getQuestions()
    const config = initConfig(options)
    const logger = createLogger(config)

    const input = (questions.length ? await inquirer.prompt(questions, options) : {}) as Answers

    // 1. Create .shhrc
    await logger.log('Creating .shhrc')
    created = await writeConfig(config)
    await logger.log(`Creating .shhrc: ${created ? 'ok' : 'skipped'}`, true)

    // 2. Optionally create template file.
    if (input.shouldCreateTemplate) {
      await logger.log(`Creating ${config.template}`)
      await createTemplate(config)
      await logger.log(`Creating ${config.template}: ok`, true)
    }

    if (config.encrypt) {
      await logger.log('Checking git-crypt install')
      // 3. Verify if git-crypt is installed.
      if (!gitCrypt.checkAvailability()) {
        await logger.log('Checking git-crypt install: fail', true)
        throw new Error('git-crypt not found. Check README.md for instructions.')
      }
      await logger.log('Checking git-crypt install: ok', true)
      // 4. Configure git-crypt.
      await logger.log('Configuring git-crypt')
      await gitCrypt.configure(config)
      await logger.log('Configuring git-crypt: ok', true)
    }
  })

addConfigOptions(command)

export { command }
