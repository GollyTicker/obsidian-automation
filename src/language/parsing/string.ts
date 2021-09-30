export const BOTLANG_BASIC_ESCAPE_RULES: [string, string][] = [
    ["\'", "\\\'"],
    ["\"", "\\\""],
    ["\\", "\\\\"]
]

export const BOTLANG_CONTROL_CHARACTER_ESCAPE_RULES: [string, string][] = [
    ["\n", "\\n"],
    ["\r", "\\r"],
    ["\t", "\\t"]
]

export const BOTLANG_STRING_ESCAPE_RULES: [string, string][] =
    BOTLANG_BASIC_ESCAPE_RULES.concat(BOTLANG_CONTROL_CHARACTER_ESCAPE_RULES)

// assumes that the length of all replacements patterns have same length
function applyReplacements(rules: [string, string][], str: string): string {
    const patternLength = rules[0][0].length
    let buf = ""

    for (let i = 0; i < str.length; i++) {
        if (i + patternLength - 1 < str.length) {

            const current = str.substr(i, patternLength)
            const match = rules.find(([pattern, _]) => current === pattern)

            if (match !== undefined) {
                const target = match[1]
                buf = buf + target
                i = i + patternLength - 1

            } else {
                buf = buf + str.charAt(i)
            }
        } else {
            buf = buf + str.charAt(i)
        }
    }

    return buf
}

export function toEscaped(literal: string): string {
    return applyReplacements(BOTLANG_STRING_ESCAPE_RULES, literal)
}

export function toLiteral(escaped: string): string {
    return applyReplacements(BOTLANG_STRING_ESCAPE_RULES.map(([a, b]) => [b, a]), escaped)
}