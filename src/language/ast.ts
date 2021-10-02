import _ from "lodash";
import {__} from "../utils";

export type BotAst = Expr

export type ExprToken = 'Atom' | 'Str' | 'Data' | 'App'

export abstract class Expr {

    abstract type: ExprToken

    public toString(): string {
        // @ts-ignore
        return window.__obsidianAutomation.astNodeToString(this)
    }
}

export class Atom extends Expr {
    type: 'Atom' = 'Atom'

    constructor(public readonly name: string) {
        super()
    }

    public specialSyntaxAtom(): boolean {
        return __(this, exprEquals, VAR) ||
            __(this, exprEquals, SEQUENCE)
    }
}

export class Str extends Expr {
    type: 'Str' = 'Str'

    constructor(public readonly str: string) {
        super();
    }
}

// generic container for any data in memory without any direct way
// to express it as a string
export class Data extends Expr {
    type: 'Data' = 'Data'

    constructor(public readonly data: any) {
        super();
    }
}

// todo. hm.... if we simplify head and tail to a list... then we get LISP!
export class App extends Expr {
    type: 'App' = 'App'

    // its recommended to use atoms as heads to decrease mental burden
    constructor(public readonly head: Expr, public readonly tail: Expr[]) {
        super()
    }
}

export const atom = (name: string) => new Atom(name);
export const data = (data: any) => new Data(data);
export const str = (x: string) => new Str(x);
export const app = (head: Expr, tail: Expr[]) => new App(head, tail);

export function app_(head: Expr, ...tail: Expr[]): App {
    return app(head, tail)
}

export const VAR = atom("var")
export const SEQUENCE = atom("sequence")

export const WHEN = atom("when")
export const BECOME = atom("become")
export const MATCHING = atom("matching")
export const ASSOCIATIONS = atom("associations");

export const CONCAT = atom("concat")

export const mkVar = (expr: Expr) => new App(VAR, [expr])
export const seq = (exprs: Expr[]) => new App(SEQUENCE, exprs);

export function seq_(...exprs: Expr[]): Expr {
    return seq(exprs)
}

export function exprEquals(l: Expr, r: Expr): boolean {
    return _.isEqual(r, l)
}