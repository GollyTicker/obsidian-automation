import {App, app, atom, Atom, Expr} from "./ast";
import {string} from "parsimmon";
import {regExpEscape} from "../common/util";
import {Random, random} from "../common/random";
import {SPECIAL_CHARS} from "./constants";

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
    } else {
        throw new TypeError("unfold: Unhandled case: " + ast);
    }
}

export class UnfoldApp<S> {
    constructor(
        public readonly headSeed: S,
        public readonly tailSeed: S[]
    ) {
    }
}


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

const SPECIAL_CHAR_REG_EXP = new RegExp("[" + regExpEscape(SPECIAL_CHARS) + "]");

const MAX_ATOM_LENGTH = 5

const MAX_APP_TAIL_LENGTH = 3

const MAX_DEPTH = 3

export function fromRandom(source: Random): Expr {
    type St = { src: Random, depth: number }

    function genAtom(src: Random): string {
        return src
            .string(src.intBetween(1, MAX_ATOM_LENGTH))
            .replace(SPECIAL_CHAR_REG_EXP, "_")
    }

    function genApp({src, depth}: St) {
        const seeds = src.split(src.intBetween(1, 1 + MAX_APP_TAIL_LENGTH))
        return new UnfoldApp(
            {src: seeds.pop(), depth: depth + 1},
            seeds.map(x => ({src: x, depth: depth + 1}))
        )
    }

    return unfold<St>(({src, depth}: St) => {
            if (depth >= MAX_DEPTH || src.boolean()) {
                return genAtom(src)
            } else {
                return genApp({src, depth})
            }
        },
        {src: source, depth: 0}
    )
}


console.log(asIndentedString(atom("sdf"), true))
console.log(asIndentedString(app(atom("sdf"), [atom("2")]), true))
console.log(asIndentedString(app(atom("sdf"), [atom("2"), atom("3")]), true))
console.log(asIndentedString(app(atom("sdf"), [app(atom("2"), []), atom("3")]), true))
console.log(asIndentedString(app(atom("sdf"), [app(atom("2"), [atom("2"), atom("3")]), atom("3")]), true))
console.log(asIndentedString(app(app(atom("2"), [atom("2"), atom("3")]), [app(atom("2"), [app(atom("2"), [atom("2"), atom("3")]), atom("3")]), atom("3")]), true))


for (let i = 0; i < 6; i++) {
    console.log("Generated string:\n" +
        asIndentedString(
            fromRandom(
                random("2qc3" + i)
            ),
            true
        )
    );

    console.log("Same AST as code:\n" +
        asCodeString(
            fromRandom(
                random("2qc3" + i)
            )
        )
    );
}