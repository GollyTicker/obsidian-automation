import {app, App, atom, Atom, data, Data, Expr, mkVar, seq, SEQUENCE, str, Str, VAR} from "../ast";
import {hasOwnProperty} from "../../utils";


export function cases<A>(
    x: Expr,
    atomF: (at: Atom) => A,
    strF: (x: Str) => A,
    dataF: (d: Data) => A,
    appF: (ap: App) => A,
    varF: (vr: App) => A = appF,
    seqF: (seq: App) => A = appF
): A {
    if (x.type === "Atom") {
        return atomF(x as Atom)
    } else if (x.type === "Data") {
        return dataF(x as Data)
    } else if (x.type === "Str") {
        return strF(x as Str)
    } else if (x.type === "App") {
        const head: Atom = <Atom>(<App>x).head
        if (head.type === "Atom") {
            switch (head.specialSyntaxMark()) {
                case "Var":
                    return varF(x as App)
                case "Sequence":
                    return seqF(x as App)
                default:
                    return appF(x as App)
            }
        } else {
            return appF(x as App)
        }
    } else {
        throw new Error("cases: Unhandled case: " + x.type + " for " + x)
    }
}

export function fold<R>
(
    atomF: (name: string) => R,
    strF: (x: string) => R,
    dataF: (data: any) => R,
    appF: (head: R, tail: R[]) => R,
    ast: Expr): R {
    return foldB(atomF, strF, dataF, appF,
        sub => appF(atomF(VAR.name), [sub]),
        exprs => appF(atomF(SEQUENCE.name), exprs),
        ast)
}

export function foldB<R>(
    atomF: (name: string) => R,
    strF: (x: string) => R,
    dataF: (data: any) => R,
    appF: (head: R, tail: R[]) => R,
    varF: (sub: R) => R,
    seqF: (exprs: R[]) => R,
    ast: Expr): R {
    const go = (x: Expr) => foldB(atomF, strF, dataF, appF, varF, seqF, x)
    return cases(ast,
        at => atomF(at.name),
        str => strF(str.str),
        dt => dataF(dt.data),
        ap => appF(go(ap.head), ap.tail.map(go)),
        vr => varF(go(vr.tail[0])),
        seq => seqF(seq.tail.map(go))
    )
}

export function unfold<S>(
    unfolder: (a: S) => { a: string } | { s: string } | { h: S, t: S[] } | { seq: S[] } | { v: S } | { d: any },
    seed: S
): Expr {
    const go = (x: S) => unfold(unfolder, x)
    const ast = unfolder(seed)

    if (hasOwnProperty(ast, 'a')) {
        return atom(ast.a);

    } else if (hasOwnProperty(ast, 's')) {
        return str(ast.s);

    } else if (hasOwnProperty(ast, 'd')) {
        return data(ast.d)

    } else if (hasOwnProperty(ast, 'seq')) {
        return seq(ast.seq.map(go))

    } else if (hasOwnProperty(ast, 'v')) {
        return mkVar(go(ast.v))

    } else if (hasOwnProperty(ast, 'd')) {
        return data(ast.d)

    } else {
        return app(
            go(ast.h),
            ast.t.map(go)
        )
    }
}

