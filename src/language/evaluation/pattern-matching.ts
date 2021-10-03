import {app_, Atom, atom, BECOME, Expr, exprEquals, mkVar, seq, WHEN} from "../ast";
import {cases} from "../transformation/base-definitions";
import {__} from "../../utils";

export const WHEN_BECOME_PATTERN = seq([
    app_(WHEN, mkVar(atom("pattern"))),
    app_(BECOME, mkVar(atom("target")))
])

export type Associations = Map<Atom, Expr>


type St = { interpolating: boolean, ctx: Associations }
type Matcher = (st: St) => Associations | undefined

const unit: Matcher = () => new Map<Atom, Expr>()

function andAlso(first: Matcher, second: Matcher): Matcher {
    /*
    * 1. match first.
    * 2. match second.
    *    second fails => undefined
    *    second succeeds => combine both contexts */
    return (st) => {
        const match1 = first(st)
        return match1 === undefined ? undefined : second({...st, ctx: match1})
    }
}

function andSequence(many: Matcher[]): Matcher {
    let acc = unit
    for (let i = many.length - 1; i >= 0; i--) {
        acc = __(many[i], andAlso, acc)
    }
    return acc
}

function zipWith<A, B, R>(func: (a: A, b: B) => R, left: A[], right: B[]): R[] {
    if (left.length > right.length) {
        return zipWith((b, a) => func(a, b), right, left)
    } else {
        return left.map((l, i) => func(l, right[i]))
    }
}

export function astMatch(pattern: Expr, target: Expr): Associations | undefined {

    // todo. interpolation could be saved as extra information at the ast itself...
    function go(pattern: Expr, target: Expr): Matcher {
        return st => {
            if (st.interpolating) {
                // todo. add new associations to context
                return undefined // todo. how shall we match with backtracking?
            } else {
                return cases(pattern,
                    at => exprEquals(at, target) ? new Map<Atom, Expr>() : undefined,
                    st => exprEquals(st, target) ? new Map<Atom, Expr>() : undefined,
                    d => exprEquals(d, target) ? new Map<Atom, Expr>() : undefined,
                    ap => cases(target,
                        () => undefined,
                        () => undefined,
                        () => undefined,
                        apTarget => ap.tail.length === apTarget.tail.length ? __(
                            go(ap.head, apTarget.head),
                            andAlso,
                            andSequence(zipWith(go, ap.tail, apTarget.tail)) // todo. do tail here
                            )(st)
                            : undefined
                    ),
                    vr => go(vr.tail[0], target)({...st, interpolating: true})
                ) // note. seq implicitly uses app
            }
        }
    }

    return go(pattern, target)({interpolating: false, ctx: new Map<Atom, Expr>()})
}