import {Expr} from "../ast";
import {fold} from "./base-definitions";
import {toEscaped} from "../parsing/string";

export function asIndentedString(
    expr: Expr,
    dataStr: (x: any) => string = (x) => x.toString(),
    fullForm: boolean = false
): string {
    const spaces = ".  "
    const indentAfterFirstNewline = (str: string) => str.replace(/\n/g, "\n" + spaces)
    return fold(
        (s) => fullForm ? "Atom(" + s + ")" : "(" + s + ")",
        (x) => `"${toEscaped(x)}"`,
        (data) => fullForm ? "Data(" + dataStr(data) + ")" : "#(" + dataStr(data) + ")",
        (head, tail) => {
            const indented = "h  " + indentAfterFirstNewline(head) + "\nt  " + indentAfterFirstNewline(tail.join("\n"))
            const bracketed = `(${head}): ${tail.map(x => '(' + x + ')').join(',')}`
            return fullForm ? "App(\n" + indented + "\n)" : bracketed
        },
        expr
    );
}


export function asCodeString(
    expr: Expr,
    dataStr: (x: any) => string = (x) => x.toString()
): string {
    return fold(
        (s) => s,
        (x) => `"${escape(x)}"`,
        dataStr,
        (head, tail) =>
            "(" + head + "): " + "(" + tail.join("), (") + ")",
        expr
    )
}