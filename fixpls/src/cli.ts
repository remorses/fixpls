import { spawn, execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { Configuration, OpenAIApi } from 'openai'

import readline from 'readline'
import {
    ToolFixer,
    dedupeArray,
    getApiKey,
    getFixerForCommand,
    storeApiKey,
} from './utils'

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
    // console.log(key)
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
    if (hasNonCommitted && !process.env.DEV) {
        console.error(
            'Please commit all your changes before running fixpls, as it will modify your files',
        )
        return process.exit(1)
    }
    let apiKey = getApiKey()
    if (!apiKey) {
        console.error(
            'Please login with `fixpls login` and provide your OpenAI API key',
        )
        return process.exit(1)
    }

    const configuration = new Configuration({
        apiKey,
    })
    const openai = new OpenAIApi(configuration)

    let [command, ...args] = process.argv.slice(commandIndex + 1)
    // Check if the command is provided
    if (!command) {
        console.error('Please provide a command to run after --')
        process.exit(1)
    }
    console.log()
    console.log(`Trying to fix ${command}...`)
    console.log(`Go take a cup of coffee while GPT fixes the code for you! ☕️`)
    console.log()
    const fixer = getFixerForCommand(command)
    let n = 0
    let max = 5
    let start = Date.now()
    while (n < max) {
        n++
        console.log(`\nRunning ${command}... (${n}/${max})\n`)

        const { code, output, stderr } = await exec(command, args)
        if (code === 0) {
            let end = Date.now()
            let time = (end - start) / 1000
            let formattedTime = time.toFixed(1)
            if (n > 1) {
                console.log(`Success! code has been fixed in ${time} seconds!`)
            }
            return process.exit(0)
        }
        await iteration({ command, output, openai, fixer })
    }
}

async function iteration({
    fixer,
    output,
    openai,
}: {
    command: string
    output: string
    openai: OpenAIApi
    fixer: ToolFixer
}) {
    const errors = fixer.parseFailOutput(output)
    type Replacement = {
        filePath: string
        replacement: string
        start: number
        end: number
    }
    let replacements: Array<Replacement | undefined> = await Promise.all(
        errors.map(async (error) => {
            // console.log(JSON.stringify(error, null, 2))

            let { line, absFilePath, instruction, column } = error
            if (!fs.existsSync(absFilePath)) {
                console.log(`Cannot fix, ${absFilePath} does not exist`)
                return
            }

            const fileText = fs.readFileSync(absFilePath, 'utf8')

            let lines = fileText.split('\n')
            let { input, start, end } = (() => {
                if (fileText.length < 1000) {
                    return {
                        input: fileText,
                        start: 0,
                        end: lines.length,
                    }
                } else {
                    let wrap = 5
                    let start = Math.max(0, line - wrap)
                    let end = Math.min(lines.length, line + wrap)
                    return {
                        input: lines
                            .slice(start, end)
                            .filter((x) => x.trim())
                            .join('\n'),
                        start,
                        end,
                    }
                }
            })()

            let res: any
            try {
                // console.log({
                //     codeLine,
                //     command,
                //     errFormatter,
                // })
                res = await openai.createEdit({
                    model: 'code-davinci-edit-001',
                    input: input,
                    instruction: instruction,
                    temperature: 0.2,
                })
            } catch (e: any) {
                console.error(`Could not call OpenAI: ${e.message}`)
                return
            }
            let choices = res.data.choices
            // console.log(choices?.length)
            let replacement = choices[0]?.text
            if (!replacement) {
                console.log('No replacement found')
                return
            }
            return {
                filePath: absFilePath,
                replacement,
                start,
                end,
            }
        }),
    )
    replacements = replacements.filter((x) => x)
    // TODO handle concurrency, if i modify the same files twice, i need to remap line numbers, adding an offset each time. i also need to run replacements sequentially in order to not mess up the line numbers

    // to not thing about concurrency for now, i will just do 1 fix per file per iteration (even this way not very optimal? because error could be fixed by a previous fix?)
    // i should track errors dependencies (code lines that have other errors) and only fix the top group with no dependencies
    // second iteration other errors will probably be fixed already
    replacements = dedupeArray(replacements, (x) => x?.filePath)

    for (let rep of replacements) {
        if (!rep) {
            continue
        }
        const { replacement, filePath, end, start } = rep
        let replacementLines = replacement.split('\n')

        let lines = fs.readFileSync(filePath, 'utf8').split('\n')
        fs.writeFileSync(
            filePath,
            lines
                .map((x, i) => {
                    if (i - start > replacementLines.length) {
                        return ''
                    }
                    if (i >= start && i < end) {
                        return replacementLines[i - start]
                    }
                    return x
                })
                // .filter((x) => x)
                .join('\n'),
        )
    }
}

// later you can add support for other tools simply adding some functions with this interface

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
