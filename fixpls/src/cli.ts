import { spawn, execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { Configuration, OpenAIApi } from 'openai'
import { parse as parseTscErrors } from '@aivenio/tsc-output-parser'

import readline from 'readline'
import { getApiKey, storeApiKey } from './utils'

async function login() {
    const rd = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    })
    let key = await new Promise<string>((resolve) =>
        rd.question('OpenAI API (will be stored locally): ', (key) => {
            resolve(key)
            rd.close()
        }),
    )
    key = key.trim()
    if (!key) {
        console.error('Please provide a valid API key')
        return process.exit(1)
    }
    storeApiKey(key)

    return
}

async function main() {
    // handle login command
    if (process.argv[2] === 'login') {
        return await login()
    }

    let commandIndex = process.argv.findIndex((x) => x === '--')
    if (commandIndex === -1) {
        console.error(
            'Please provide a command to run after --, like `fixpls -- tsc`',
        )
        return process.exit(1)
    }
    const hasNonCommitted = hasNonCommittedFiles()
    if (hasNonCommitted) {
        console.error(
            'Please commit all your changes before running fixpls, as it will modify your files',
        )
        return process.exit(1)
    }
    let key = getApiKey()
    const configuration = new Configuration({
        apiKey: process.env.OPENAI_API_KEY,
    })
    const openai = new OpenAIApi(configuration)

    if (!key) {
        console.error(
            'Please login with `fixpls login` and provide your OpenAI API key',
        )
        return process.exit(1)
    }

    let [command, ...args] = process.argv.slice(commandIndex + 1)
    // Check if the command is provided
    if (!command) {
        console.error('Please provide a command to run after --')
        process.exit(1)
    }
    const { code, output, stderr } = await exec(command, args)
    if (code === 0) {
        return process.exit(0)
    }

    console.log()
    console.log(`Trying to fix ${command}...`)
    console.log()

    const errors = parseTscErrors(output)

    await Promise.all(
        errors.map(async (error) => {
            console.log(JSON.stringify(error, null, 2))
            let filename = error?.value?.path?.value
            let abs = path.resolve(filename)
            if (!fs.existsSync(abs)) {
                console.log(`Cannot fix, ${abs} does not exist`)
                return
            }
            let line = error?.value?.cursor.value.line
            const fileText = fs.readFileSync(abs, 'utf8')
            let lines = fileText.split('\n')
            let codeLine = lines[line - 1]

            const errFormatter = error?.value?.message?.value
            let res: any
            try {
                res = await openai.createEdit({
                    model: 'text-davinci-edit-001',
                    input: codeLine,
                    instruction: `Fix the following ${command} error: ${errFormatter}`,
                })
            } catch (e: any) {
                console.error(`Could not call OpenAI, ${e.message}}`)
            }
            let choices = res.data.choices
            let replacement = choices[0]?.text
            if (!replacement) {
                console.log('No replacement found')
                return
            }
            fs.writeFileSync(
                abs,
                lines
                    .map((x, i) => (i === line - 1 ? replacement : x))
                    .join('\n'),
            )
        }),
    )
}

function hasNonCommittedFiles() {
    // if this is not a github repo, we don't care
    try {
        execSync('git rev-parse --is-inside-work-tree', {
            stdio: 'pipe',
        })
    } catch (e) {
        return false
    }
    try {
        execSync('git diff --exit-code', { stdio: 'pipe' })
        return false
    } catch (e) {
        return true
    }
}

function exec(command, args) {
    return new Promise<{
        code: number
        stdout: string
        stderr: string
        output: string
    }>((resolve, reject) => {
        // Initialize variables to store stdout and stderr
        let stdout = ''
        let stderr = ''
        let output = ''

        // Spawn the command with its arguments
        const childProcess = spawn(command, args, {
            stdio: ['inherit', 'pipe', 'pipe'],
            env: process.env,
            shell: true,
        })

        // Handle stdout
        childProcess.stdout.on('data', (data) => {
            stdout += data.toString()
            output += data.toString()
            process.stdout.write(data)
        })

        // Handle stderr
        childProcess.stderr.on('data', (data) => {
            stderr += data.toString()
            output += data.toString()
            process.stderr.write(data)
        })
        // Handle process exit
        childProcess.on('exit', (code) => {
            resolve({ code: code || 0, stdout, stderr, output })
            // console.log('\nProcess exited with code', code)
            // console.log('stdout:', stdout)
            // console.log('stderr:', stderr)
        })
    })
}

main()
