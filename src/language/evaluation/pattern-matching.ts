import {App, app_, Atom, atom, BECOME, Expr, exprEquals, mkVar, seq, WHEN} from "../ast";
import {cases} from "../transformation/base-definitions";
import {__} from "../../utils";
import {Map as IMap} from "immutable";
import {debugConfig} from "../../debug";

export const WHEN_BECOME_PATTERN = seq([
    app_(WHEN, mkVar(atom("pattern"))),
    app_(BECOME, mkVar(atom("target")))
])

export type Associations = IMap<string, Expr>
export type MatchRes = Associations | undefined

type St = { interpolating: boolean, assocs: Associations }
type Matcher = (st: St) => MatchRes

export const emptyAssoc = IMap<string, Expr>()

const neverMatcher: Matcher = () => undefined
const unitMatcher: Matcher = (st) => st.assocs

function andAlso(first: Matcher, second: Matcher): Matcher {
    return (st) => {
        const match1 = first(st)
        return match1 === undefined ? undefined : second({...st, assocs: match1})
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

            debugConfig.evaluation.patternMatcher && console.log(`Matching (${JSON.stringify(st)}) ${pattern} =? ${target}`)

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
            debugConfig.evaluation.patternMatcher && console.log(`Matched (${JSON.stringify(st)}) [ ${pattern} =? ${target} ] ==>> ${matchToString(res)}`)
            return res
        }
    }

    return recUnify(pattern, target)({interpolating: false, assocs: emptyAssoc})
}

const toogleInterpolation = (st: St) => ({...st, interpolating: !st.interpolating})

function singletonMatcher(atom: Atom, expr: Expr): Matcher {
    return st => {
        const previousMatch = st.assocs.get(atom.name)
        if (previousMatch) {
            // when an atom is already matched, then we check, if both matches are consistent.
            return equalsMatcher(previousMatch, expr)(st)
        } else {
            return st.assocs.set(atom.name, expr)
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