import path from 'path'
import fs from 'fs'
import getAppDataPath from 'appdata-path'
import { fixers } from './fixers'

const apiKeyKey = 'openai-api-key.txt'

export function storeApiKey(key: string) {
    const appDataPath = getAppDataPath('fixpls')
    const apiKeyPath = path.join(appDataPath, apiKeyKey)
    fs.mkdirSync(appDataPath, { recursive: true })
    fs.writeFileSync(apiKeyPath, key)
}

export function getApiKey(): string {
    const appDataPath = getAppDataPath('fixpls')
    try {
        const apiKeyPath = path.join(appDataPath, apiKeyKey)
        const key = fs.readFileSync(apiKeyPath, 'utf8')
        return key
    } catch (e) {
        return ''
    }
}

export function dedupeArray<T>(
    arr: T[],
    key: (x: T) => string | undefined,
): T[] {
    const seen = new Set()
    return arr.filter((x) => {
        const k = key(x)
        if (!k) {
            return false
        }
        if (seen.has(k)) {
            return false
        }
        seen.add(k)
        return true
    })
}



export interface ToolFixer {
    parseFailOutput(output: string): Array<{
        line: number
        column?: number

        absFilePath: string
        instruction: string
    }>
    commands: Set<string>
}

export function getFixerForCommand(command: string): ToolFixer {
    command = command.trim()
    for (let fixer of fixers) {
        if (fixer.commands.has(command)) {
            return fixer
        }
    }
    throw new Error(`Fixpls has no support for command ${command}`)
}
