import {app, atom, BotAst, exprEquals, seq_} from "../ast";
import {assert, test} from "../../tester/tester";
import {random} from "../../common/random";
import {fold} from "./base-definitions";
import {asCodeString, asIndentedString} from "./foldings";
import {fromRandom} from "./unfoldings";
import {parseBotCode} from "../parsing/bot-lang-parser";
import {simpleResultOutput} from "../parsing/debug";
import {a, f, st} from "../shortform";
import {debugConfig} from "../../debug";

export const add = 0;

if (debugConfig.loadTests) {

    test("fold works", async () => {
        const ast = atom("sdfsd")
        const left = fold<number>(x => x.length, () => 2, () => 1, () => 0, ast)
        assert(left === 5, left, 5)
    })

    const asts = [
        atom("sdf"),
        app(atom("sdf"), [atom("2")]),
        app(atom("sdf"), [atom("2"), atom("3")]),
        app(atom("sdf"), [app(atom("2"), []), atom("3")]),
        app(atom("sdf"), [app(atom("2"), [atom("2"), atom("3")])]),
        app(app(atom("2"), [atom("2"), atom("3")]), [app(atom("2"), [app(atom("2"), [atom("2"), atom("3")]), atom("3")]), atom("3"), atom("3")])
    ]

    asts.forEach(ast => {
        test("indented string", async () => {
            asIndentedString(ast, false, undefined)
            asIndentedString(ast, true, undefined)
        })
    })

    const explicitAstTests = [
        f(a("a"), st("\\\'z")),
        f(a("a"), st("\\\\'z")),
        f(a("a"), st("\\\\\\'z")),
        f(a("a"), st("\\\\\\\'z")),
        f(a("a"), st("\\")),
        f(a("a"), st("\\\\")),
        f(a("a"), st("\\\\\\")),
        f(a("a"), st("\\\\\\\\"))
    ]

    explicitAstTests.forEach(testConvertAstToCodeStringAndParseAgain)

    const NUMBER_OF_RANDOM_TESTS = 50 // Even as far as 10k works! Yuhu!

    const NUMBER_OF_TEST_CASES_TO_SHOW = 5

    for (let i = 0; i < NUMBER_OF_RANDOM_TESTS; i++) {

        test("AST generation and to string does not throw errors", async () => {
            const source = random("2qc3" + i)

            const ast = fromRandom(source)

            const indentedString = asIndentedString(ast, true, undefined)
            const codeString = asCodeString(ast)

            if (i < NUMBER_OF_TEST_CASES_TO_SHOW) {
                console.log("Generated string:\n" + indentedString);
                console.log("Same AST as code:\n" + codeString);
            }
        })

        const source = random("2qc3" + i)

        const ast = fromRandom(source, {Atom: 2, Str: 3, Data: 0, App: 5})

        testConvertAstToCodeStringAndParseAgain(ast)

    }

    function testConvertAstToCodeStringAndParseAgain(ast: BotAst) {
        test("code strings can be parsed again (excluding data expressions)", async () => {

            const codeStr = asCodeString(ast)
            const result = parseBotCode(codeStr)

            await result.catch(async () => {
                await simpleResultOutput(result, (x) => {
                    console.log("Code: [" + codeStr + "]\n" + asIndentedString(ast, true))
                    console.log(x)
                })
            })

            const resultAst = await result
            const expectedAst = seq_(ast)
            assert(exprEquals(expectedAst, resultAst), expectedAst, resultAst)
        })
    }

    // todo. use property based testing: https://github.com/dubzzz/fast-check
    // integration with jasmin: https://github.com/dubzzz/fast-check-examples/blob/main/test-jasmine/example.spec.js

}