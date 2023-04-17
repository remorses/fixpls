import { ToolFixer } from '../utils'
import { parse as parseTscErrors } from '@aivenio/tsc-output-parser'
import path from 'path'

export const tsc: ToolFixer = {
    commands: new Set(['tsc']),
    parseFailOutput(output: string) {
        let errors = parseTscErrors(output)
        return errors.map((error) => {
            let filename = error?.value?.path?.value
            let abs = path.resolve(filename)
            let line = error?.value?.cursor.value.line
            let column = error?.value?.cursor.value.column
            let errorMessage = error?.value?.message?.value?.trim()

            return {
                line,
                column,
                instruction: `Fix the following typescript error, try to not add any new code:\n${errorMessage}\n`,
                absFilePath: abs,
            }
        })
    },
}
