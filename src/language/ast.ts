import _ from "lodash";
import {$$} from "../utils";

export type BotAst = Seq

export abstract class Expr {

    abstract type: 'Atom' | 'Data' | 'App' | 'Str'

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
        return $$(this, exprEquals, VAR_ATOM) ||
            $$(this, exprEquals, SEQUENCE_ATOM)
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

// Seq(...) == App(Atom(sequence), ...)
export class Seq extends App {
    constructor(public readonly tail: Expr[]) {
        super(atom("sequence"), tail);
    }
}

export const atom = (name: string) => new Atom(name);
export const data = (data: any) => new Data(data);
export const str = (x: string) => new Str(x);
export const app = (head: Expr, tail: Expr[]) => new App(head, tail);

export const VAR_ATOM = atom("var")
export const SEQUENCE_ATOM = atom("sequence")

export const seq = (exprs: Expr[]) => new App(SEQUENCE_ATOM, exprs);

export function exprEquals(l: Expr, r: Expr): boolean {
    return _.isEqual(r, l)
}