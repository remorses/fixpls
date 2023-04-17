import { spawn } from 'child_process'

async function main() {
    let commandIndex = process.argv.findIndex((x) => x === '--')
    if (commandIndex === -1) {
        console.error(
            'Please provide a command to run after --, like `fixpls -- tsc`',
        )
        return process.exit(1)
    }
    let [command, ...args] = process.argv.slice(commandIndex + 1)
    // Check if the command is provided
    if (!command) {
        console.error('Please provide a command to run after --')
        process.exit(1)
    }
    const { code, stdout, stderr } = await exec(command, args)
    if (code === 0) {
        return process.exit(0)
    }
}

function exec(command, args) {
    return new Promise<{ code: number; stdout: string; stderr: string }>(
        (resolve, reject) => {
            // Initialize variables to store stdout and stderr
            let stdout = ''
            let stderr = ''

            // Spawn the command with its arguments
            const childProcess = spawn(command, args, {
                stdio: ['inherit', 'pipe', 'pipe'],
                env: process.env,
                shell: true,
            })

            // Handle stdout
            childProcess.stdout.on('data', (data) => {
                stdout += data.toString()
                process.stdout.write(data)
            })

            // Handle stderr
            childProcess.stderr.on('data', (data) => {
                stderr += data.toString()
                process.stderr.write(data)
            })
            // Handle process exit
            childProcess.on('exit', (code) => {
                resolve({ code: code || 0, stdout, stderr })
                // console.log('\nProcess exited with code', code)
                // console.log('stdout:', stdout)
                // console.log('stderr:', stderr)
            })
        },
    )
}

main()
