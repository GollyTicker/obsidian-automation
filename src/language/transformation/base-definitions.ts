import {app, App, atom, Atom, Expr} from "../ast";

export function fold<R>
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
    } else {
        throw new Error("fold: Unhandled case" + ast)
    }
}

export function unfold<S>(
    unfolder: (a: S) => string | { h: S, t: S[] },
    seed: S
): Expr {
    const ast = unfolder(seed)

    if (typeof ast === "string") {
        return atom(ast);

    } else if (ast.h !== undefined) {
        return app(
            unfold(unfolder, ast.h),
            ast.t.map(s => unfold(unfolder, s))
        )
    } else {
        throw new Error("unfold: Unhandled case: " + ast);
    }
}