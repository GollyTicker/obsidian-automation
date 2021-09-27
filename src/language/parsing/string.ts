const JAVASCRIPT_STRING_ESCAPES = [
    ["\'", "\\\'"],
    ["\"", "\\\""],
    ["\\", "\\\\"],
    ["\n", "\\n"],
    ["\r", "\\r"],
    ["\t", "\\t"],
]

function escape(literal: string): string {
    JAVASCRIPT_STRING_ESCAPES.forEach(([lit, esc]) => {
        literal = literal.replace(lit, esc)
    })
    return literal
}

function literal(escaped: string): string {
    JAVASCRIPT_STRING_ESCAPES.forEach(([lit, esc]) => {
        escaped = escaped.replace(esc, lit)
    })
    return escaped
}