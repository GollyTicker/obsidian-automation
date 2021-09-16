export const seq = (exprs: Expr[]) => new Seq(exprs);
export const atom = (name: string) => new Atom(name);
export const app = (head: Expr, tail: Expr[]) => new App(head, tail);

export type BotAst = Seq

export interface Expr {
    toString(): string
}

class App implements Expr {
    constructor(public readonly head: Expr, public readonly args: Expr[]) {
    }

    toString() {
        return "App(" + this.head.toString() + ", " + this.args.toString() + ")"
    }
}

class Seq extends App {
    constructor(public readonly args: Expr[]) {
        super("sequence", args);
    }

    toString(): string {
        return "Sequence(" + this.args.toString() + ")";
    }
}

export class Atom implements Expr {
    constructor(public readonly name: string) {
    }

    toString() {
        return "Atom(" + this.name + ")"
    }
}