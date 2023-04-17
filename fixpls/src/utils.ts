import path from 'path'
import fs from 'fs'
import getAppDataPath from 'appdata-path'

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
