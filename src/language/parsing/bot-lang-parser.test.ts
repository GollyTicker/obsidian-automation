import {assert, test} from "../../tester/tester";
import {parseBotCode} from "./bot-lang-parser";
import {BECOME, Expr, exprEquals, seq, WHEN} from "../ast";
import {a, f, s, st} from "../shortform";
import {asIndentedString} from "../transformation/foldings";
import {simpleResultOutput} from "./debug";
import {debugConfig} from "../../debug";

export const add = 0;

if (debugConfig.loadTests) {

    const SOME_FUNC_SOME_ARG_123 = f(a("some-func"), a("some-arg"), a("123"), a("4532"))
    const WHEN_ABB_CDD_E = f(
        WHEN,
        f(a("a"), a("b"), a("b")),
        f(a("c"), a("d"), a("d")),
        a("e")
    )

    const testCases: { [p: string]: Expr } = <{ [p: string]: Expr }><unknown>{
        "some-func": s(a("some-func")),
        "123": s(a("123")),
        "123:": s(f(a("123"))),
        "some-func: some-arg": s(f(a("some-func"), a("some-arg"))),
        "some-func: some-arg: null, another-arg": s(f(a("some-func"), f(a("some-arg"), a("null"), a("another-arg")))),
        "some-func: some-arg, 123, 4532": s(SOME_FUNC_SOME_ARG_123),

        ["some-func: some-arg, 123, 4532\n" +
        "some-func: some-arg, 123, 4532"]: s(SOME_FUNC_SOME_ARG_123, SOME_FUNC_SOME_ARG_123),

        ["some-func: some-arg 123 4532\n" +
        "some-func: some-arg 123 4532"]: s(SOME_FUNC_SOME_ARG_123, SOME_FUNC_SOME_ARG_123),

        '(""):': s(f(st(""))),
        '(""): ': s(f(st(""))),
        '(""): \n': s(f(st(""))),
        '(""): \n ': s(f(st(""))),

        'a:': s(f(a("a"))),
        'a: ': s(f(a("a"))),
        'a: \n': s(f(a("a"))),
        'a: \n ': s(f(a("a"))),

        "when: (a : b b) (c :d d) e": s(WHEN_ABB_CDD_E),

        ["when: (a: b b) (c: d d) e\n" +
        "when: (a: b,b) (c: d d) e\n" +
        "when: (a: b, b) (c: d d) e\n" +
        "when: (a: b ,b) (c: d d) e\n" +
        "when: (a: b b),(c: d d) e\n" +
        "when: (a: b b), (c: d d) e\n" +
        "when: (a: b b) ,(c: d d) e\n" +
        "when: (a: b b) (c: d,d) e\n" +
        "when: (a: b b) (c: d, d) e\n" +
        "when: (a: b b) (c: d ,d) e\n" +
        "when: (a: b b) (c: d d),e\n" +
        "when: (a: b b) (c: d ,d), e\n" +
        "when: (a: b b) (c: d ,d) ,e"]: seq(Array(13).fill(WHEN_ABB_CDD_E)),

        ["when: calc: plus, a, a\n" +
        "become: js-eval: something"]: s(
            f(WHEN, f(a("calc"), a("plus"), a("a"), a("a"))),
            f(BECOME, f(a("js-eval"), a("something")))
        ),

        ["when: (calc:\n" +
        "plus), a, a\n" +
        "when: (calc: a s ,d\n" +
        "plus\n" +
        "s\n" +
        "d s\n" +
        ")\n" +
        "become: js-eval: something"]: s(
            f(WHEN,
                f(a("calc"), a("plus")),
                a("a"),
                a("a")),
            f(WHEN, f(a("calc"), a("a"), a("s"), a("d"), a("plus"), a("s"), a("d"), a("s"))),
            f(BECOME, f(a("js-eval"), a("something")))
        ),

        ["when: (calc: plus), a, a\n" +
        "become: js-eval: something"]: s(
            f(WHEN, f(a("calc"), a("plus")), a("a"), a("a")),
            f(BECOME, f(a("js-eval"), a("something")))
        ),

        ["when: calc: \"plus\": bla, \"a,dvs sfS32fr=W%ra\"\n" +
        "become: js-eval: something"]: s(
            f(WHEN, f(a("calc"), f(st("plus"), a("bla"), st("a,dvs sfS32fr=W%ra")))),
            f(BECOME, f(a("js-eval"), a("something")))
        ),

        "a: \"\\\\\\'z\"": s(f(a("a"), st("\\\'z"))),

        ['when: calc: "plus": blubb, "a,dvs \\nsfS32fr=W%ra"\n' +
        'a: 000000011111111112\n' +
        'a: 345678901234567890\n' +
        'when: calc: "plus" , "a,dvs \\nsfS32fr=W%ra"\n' +
        'when: calc: "plus" ,"a,dvs \\nsfS32fr=W%ra"\n' +
        'when: calc: "pls\n' +
        '\tt\\\\\n' +
        'nl\\"\n' +
        '"']: s(
            f(WHEN, f(a("calc"), f(st("plus"), a("blubb"), st("a,dvs \nsfS32fr=W%ra")))),
            f(a("a"), a("000000011111111112")),
            f(a("a"), a("345678901234567890")),
            f(WHEN, f(a("calc"), st("plus"), st("a,dvs \nsfS32fr=W%ra"))),
            f(WHEN, f(a("calc"), st("plus"), st("a,dvs \nsfS32fr=W%ra"))),
            f(WHEN, f(a("calc"), st("pls\n" +
                "\tt\\\n" +
                "nl\"\n")))
        )/*,

    // todo. continue here.
    ["when: calc: plus, %a, var: b\n" +
    "become: js-eval: %\"%a + b\""]: s(
        f(WHEN, f(a("calc"), a("plus"), v(a("a")), v(a("b")))),
        f(BECOME, f(a("js-eval"), v(
            f(CONCAT,
                v(a("a")),
                st(" + b")
            )
        )))
    ),*/
        //
        // ["when: calc: plus, %a, var: b\n" +
        // "become: js-eval: %\"%a + %b\""]: null,
        //
        // ["when: calc: plus, %a, var: b\n" +
        // "become: js-eval: %\"%(a: b) + %b\""]: null,
        //
        // ["when: calc: plus, %a, %b\n" +
        // "become: js-eval: %\"%a + b\""]: null,
        //
        // ["associations: (a: 3, b: 5)\n" +
        // "js-eval: %\"%a + %b\""]: null,
        //
        // "sequence: (when: %pattern), (become: %expr)": null,
    }


    for (const code in testCases) {
        test("parser parses test expression", async () => {

            const result = parseBotCode(code)

            await result.catch(async () => {
                await simpleResultOutput(result, (x) => {
                    console.log("Code: [" + code + "]")
                    console.log(x)
                })
            })

            const ast = await result

            assert(exprEquals(ast, testCases[code]),
                asIndentedString(testCases[code], true),
                asIndentedString(ast, true)
            )
        })
    }

    // todo. add negative tests

}
