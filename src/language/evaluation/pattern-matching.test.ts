import {assert, test} from "../../tester/tester";
import {a, f, v} from "../shortform";
import {matchEquality, MatchRes, matchToString, patternMatch} from "./pattern-matching";
import {Atom, Expr} from "../ast";
import {Map as IMap} from "immutable";

export const add = 0

test("matcher works correctly", async () => {
    const testCases: [Expr, Expr, MatchRes][] = [
        [
            f(a("hello"), a("blubb")),
            f(a("hello"), a("blubb")),
            IMap<Atom, Expr>()
        ],

        [
            f(v(a("bla")), a("blubb")),
            f(a("hello"), a("blubb")),
            IMap<Atom, Expr>([[a("bla"), a("hello")]])
        ],

        [
            f(a("bla"), a("blubb")),
            f(a("hello"), a("blubb")),
            undefined
        ],

        [
            f(v(v(a("bla"))), a("blubb")),
            f(a("hello"), a("blubb")),
            undefined
        ]
    ]

    testCases.forEach(t => {
        const match = patternMatch(t[0], t[1])
        assert(matchEquality(t[2], match),
            matchToString(t[2]),
            matchToString(match))
    })
})