import {app, App, atom, Atom, data, Data, Expr, str, Str} from "../ast";
import {hasOwnProperty} from "../../utils";

export function cases<A>(
    x: Expr,
    atomF: (at: Atom) => A,
    strF: (x: Str) => A,
    dataF: (d: Data) => A,
    appF: (ap: App) => A
): A {
    if (x.type === "Atom") {
        return atomF(x as Atom)
    } else if (x.type === "Data") {
        return dataF(x as Data)
    } else if (x.type === "Str") {
        return strF(x as Str)
    } else if (x.type === "App") {
        return appF(x as App)
    } else {
        throw new Error("cases: Unhandled case" + x.type)
    }
}

export function fold<R>
(
    atomF: (name: string) => R,
    strF: (x: string) => R,
    dataF: (data: any) => R,
    appF: (head: R, tail: R[]) => R,
    ast: Expr): R {
    const go = (x: Expr) => fold(atomF, strF, dataF, appF, x)
    return cases(ast,
        at => atomF(at.name),
        str => strF(str.str),
        dt => dataF(dt.data),
        ap => appF(go(ap.head), ap.tail.map(go)),
    )
}

export function unfold<S>(
    unfolder: (a: S) => { a: string } | { s: string } | { h: S, t: S[] } | { d: any },
    seed: S
): Expr {
    const ast = unfolder(seed)

    if (hasOwnProperty(ast, 'a')) {
        return atom(ast.a);

    } else if (hasOwnProperty(ast, 's')) {
        return str(ast.s);

    } else if (hasOwnProperty(ast, 'd')) {
        return data(ast.d)

    } else {
        return app(
            unfold(unfolder, ast.h),
            ast.t.map(s => unfold(unfolder, s))
        )
    }
}

