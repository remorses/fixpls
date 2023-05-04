import { ToolFixer } from '../utils'
import { tsc } from './tsc'

export const fixers: ToolFixer[] = [
    tsc,
    // TODO add support for Rust compile output, pylint, 
]
