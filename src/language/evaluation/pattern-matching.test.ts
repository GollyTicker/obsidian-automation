import {assert, test} from "../../tester/tester";
import {a, f, v} from "../shortform";
import {emptyAssoc, matchEquality, MatchRes, matchToString, patternMatch} from "./pattern-matching";
import {Expr} from "../ast";
import {Map as IMap} from "immutable";

export const add = 0

test("matcher works correctly", async () => {
    const testCases: [Expr, Expr, MatchRes][] = [
        [
            f(a("hello"), a("blubb")),
            f(a("hello"), a("blubb")),
            emptyAssoc
        ],

        [
            f(v(a("bla")), a("blubb")),
            f(a("hello"), a("blubb")),
            IMap([["bla", a("hello")]])
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
        ],

        [
            f(v(v(v(a("bla")))), a("blubb")),
            f(a("hello"), a("blubb")),
            IMap([["bla", a("hello")]])
        ],

        [
            f(v(a("bla")), v(a("bla"))),
            f(a("hello"), a("hello")),
            IMap([["bla", a("hello")]])
        ],

        [
            f(v(a("bla")), v(a("bla"))),
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