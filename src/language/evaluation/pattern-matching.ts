import {App, app_, Atom, atom, BECOME, Expr, exprEquals, mkVar, seq, WHEN} from "../ast";
import {cases} from "../transformation/base-definitions";
import {__} from "../../utils";
import {Map as IMap} from "immutable";

export const WHEN_BECOME_PATTERN = seq([
    app_(WHEN, mkVar(atom("pattern"))),
    app_(BECOME, mkVar(atom("target")))
])

export type Associations = IMap<Atom, Expr>
export type MatchRes = Associations | undefined

type St = { interpolating: boolean, ctx: Associations }
type Matcher = (st: St) => MatchRes

const emptyAssoc = IMap<Atom, Expr>()

const neverMatcher: Matcher = () => undefined
const unitMatcher: Matcher = (st) => st.ctx

function andAlso(first: Matcher, second: Matcher): Matcher {
    /*
    * 1. match first.
    * 2. match second.
    *    second fails => undefined
    *    second succeeds => combine both contexts */
    return (st) => {
        const match1 = first(st)
        console.log("First: (" + JSON.stringify(st) + ") " + matchToString(match1))
        return match1 === undefined ? undefined : second({...st, ctx: match1})
    }
}

function andSequence(many: Matcher[]): Matcher {
    let acc: Matcher = unitMatcher
    for (let i = 0; i < many.length; i++) {
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

function equalsMatcher(left: Expr, right: Expr): Matcher {
    return exprEquals(left, right) ? unitMatcher : neverMatcher
}

export function patternMatch(pattern: Expr, target: Expr): MatchRes {

    function recUnify(pattern: Expr, target: Expr): Matcher {
        return st => {

            console.log(`Matching (${JSON.stringify(st)}) ${pattern} =? ${target}`)

            const matcher: Matcher = cases(pattern,
                at => st.interpolating ? singletonMatcher(at, target) : equalsMatcher(at, target),
                s => equalsMatcher(s, target),
                d => equalsMatcher(d, target),
                // todo. ^ customer matchers could be here ^
                ap => {
                    if (target.type !== "App") {
                        return neverMatcher
                    }
                    const apTarget = <App>target
                    return ap.tail.length !== apTarget.tail.length ? neverMatcher :
                        __(
                            recUnify(ap.head, apTarget.head),
                            andAlso,
                            andSequence(zipWith(recUnify, ap.tail, apTarget.tail))
                        )
                },
                vr => (st) => recUnify(vr.tail[0], target)(toogleInterpolation(st))
            ) // note. seq handled implicitly via App

            const res = matcher(st)
            console.log(`Matched (${JSON.stringify(st)}) [ ${pattern} =? ${target} ] ==>> ${matchToString(res)}`)
            return res
        }
    }

    return recUnify(pattern, target)({interpolating: false, ctx: emptyAssoc})
}

const toogleInterpolation = (st: St) => ({...st, interpolating: !st.interpolating})

function singletonMatcher(atom: Atom, expr: Expr): Matcher {
    return st => {
        const previousMatch = st.ctx.get(atom)
        if (previousMatch) {
            // when an atom is already matched, then we check, if both matches are consistent.
            return equalsMatcher(previousMatch, expr)(st)
        } else {
            return st.ctx.set(atom, expr)
        }
    }
}


export function matchToString(map: MatchRes): string {
    if (map === undefined) {
        return "undefined"
    }
    let buf = ""
    for (const [key, value] of map.entries()) {
        buf = buf + (buf === "" ? "" : ", ") + key.toString() + "->" + value.toString()
    }
    return buf === "" ? "(empty)" : buf
}

export function matchEquality(left: MatchRes, right: MatchRes): boolean {
    return matchToString(left) === matchToString(right) // lazy equality
}