import {XOR} from "ts-xor";

export type BotAst = Seq

export type Expr = XOR<Atom, App>

export abstract class AstNode {

    public toString(): string {
        // @ts-ignore
        return window.__obsidianAutomation.astNodeToString(this)
    }
}

export class Atom extends AstNode {
    constructor(public readonly name: string) {
        super()
    }
}

// todo. hm.... if we simplify head and tail to a list... then we get LISP!
export class App extends AstNode {
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
export const app = (head: Expr, tail: Expr[]) => new App(head, tail);

export const SEQUENCE = atom("sequence")
export const seq = (exprs: Expr[]) => new App(SEQUENCE, exprs);