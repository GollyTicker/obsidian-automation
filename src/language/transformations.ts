import {App, app, atom, Atom, Expr} from "./ast";
import {string} from "parsimmon";

export function fold<At, Ap, R>
(
    atomF: (name: string) => R,
    appF: (head: R, tail: R[]) => R,
    ast: Expr): R {

    if (ast instanceof Atom) {
        return atomF(ast.name);

    } else if (ast instanceof App) {
        return appF(
            fold(atomF, appF, ast.head),
            ast.tail.map(x => fold(atomF, appF, x))
        )
    }
}

export function unfold<S>(
    unfolder: (a: S) => string | UnfoldApp<S>,
    seed: S
): Expr {
    const ast = unfolder(seed)

    if (typeof ast === "string") {
        return atom(ast);

    } else if (ast instanceof UnfoldApp) {
        return app(
            unfold(unfolder, ast.headSeed),
            ast.tailSeed.map(s => unfold(unfolder, s))
        )
    }
}

export class UnfoldApp<S> {
    constructor(
        public readonly headSeed: S,
        public readonly tailSeed: S[]
    ) {
    }
}


export function asIndentedString(expr: Expr, concise: boolean = true): string {
    const spaces = ".  "
    const indentAfterFirstNewline = (str: string) => str.replace(/\n/g, "\n" + spaces)
    return fold(
        (s) => concise ? s : "Atom(" + s + ")",
        (head, tail) => {
            const indented = "h  " + indentAfterFirstNewline(head) + "\nt  " + indentAfterFirstNewline(tail.join("\n"))
            return concise ? indented : "App(\n" + indented + "\n)"
        },
        expr
    );
}

console.log(asIndentedString(atom("sdf"), false))
console.log(asIndentedString(app(atom("sdf"), [atom("2")]), false))
console.log(asIndentedString(app(atom("sdf"), [atom("2"), atom("3")]), false))
console.log(asIndentedString(app(atom("sdf"), [app(atom("2"), []), atom("3")]), false))
console.log(asIndentedString(app(atom("sdf"), [app(atom("2"), [atom("2"), atom("3")]), atom("3")]), false))
console.log(asIndentedString(app(app(atom("2"), [atom("2"), atom("3")]), [app(atom("2"), [app(atom("2"), [atom("2"), atom("3")]), atom("3")]), atom("3")]), false))

// todo. random generated trees could come here