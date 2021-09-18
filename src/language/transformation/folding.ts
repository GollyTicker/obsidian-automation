import {Expr} from "../ast";
import {fold} from "./base";

export function asIndentedString(expr: Expr, fullForm: boolean = false): string {
    const spaces = ".  "
    const indentAfterFirstNewline = (str: string) => str.replace(/\n/g, "\n" + spaces)
    return fold(
        (s) => fullForm ? "Atom(" + s + ")" : s,
        (head, tail) => {
            const indented = "h  " + indentAfterFirstNewline(head) + "\nt  " + indentAfterFirstNewline(tail.join("\n"))
            return fullForm ? "App(\n" + indented + "\n)" : indented
        },
        expr
    );
}

export function asCodeString(expr: Expr): string {
    return fold(
        (s) => s,
        (head, tail) =>
            "(" + head + "): " + "(" + tail.join("), (") + ")",
        expr
    )
}