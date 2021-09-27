export const JAVASCRIPT_BASIC_ESCAPES = [
    ["\'", "\\\'"],
    ["\"", "\\\""],
    ["\\", "\\\\"]
]

export const JAVASCRIPT_CONTROL_CHARACTER_ESCAPES = [
    ["\n", "\\n"],
    ["\r", "\\r"],
    ["\t", "\\t"]
]

export const JAVASCRIPT_STRING_ESCAPES =
    JAVASCRIPT_BASIC_ESCAPES.concat(JAVASCRIPT_CONTROL_CHARACTER_ESCAPES)

export function strEscape(literal: string): string {
    JAVASCRIPT_STRING_ESCAPES.forEach(([lit, esc]) => {
        literal = literal.replaceAll(lit, esc)
    })
    return literal
}

export function strLiteral(escaped: string): string {
    JAVASCRIPT_STRING_ESCAPES.forEach(([lit, esc]) => {
        escaped = escaped.replaceAll(esc, lit)
    })
    return escaped
}