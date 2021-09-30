import {app, atom, exprEquals, seq_} from "../ast";
import {assert, test} from "../../tester/tester";
import {random} from "../../common/random";
import {fold} from "./base-definitions";
import {asCodeString, asIndentedString} from "./foldings";
import {fromRandom} from "./unfoldings";
import {parseBotCode} from "../parsing/bot-lang-parser";
import {simpleResultOutput} from "../parsing/debug";

export const add = 0;

test("fold works", async () => {
    const ast = atom("sdfsd")
    const left = fold<number>(x => x.length, () => 2, () => 1, () => 0, ast)
    assert(left === 5, left, 5)
})

test("showcase indented string", async () => {
    const asts = [
        atom("sdf"),
        app(atom("sdf"), [atom("2")]),
        app(atom("sdf"), [atom("2"), atom("3")]),
        app(atom("sdf"), [app(atom("2"), []), atom("3")]),
        app(atom("sdf"), [app(atom("2"), [atom("2"), atom("3")])]),
        app(app(atom("2"), [atom("2"), atom("3")]), [app(atom("2"), [app(atom("2"), [atom("2"), atom("3")]), atom("3")]), atom("3"), atom("3")])
    ]

    asts.forEach(ast => {
        console.log(asIndentedString(ast, false, undefined));
    })

    asts.forEach(ast => {
        console.log(asIndentedString(ast, true, undefined));
    })
})

const NUMBER_OF_RANDOM_TESTS = 10

for (let i = 0; i < NUMBER_OF_RANDOM_TESTS; i++) {

    const source = random("2qc3" + i)

    test("showcase AST generation", async () => {
        const ast = fromRandom(source)
        console.log("Generated string:\n" +
            asIndentedString(ast, true, undefined)
        );

        console.log("Same AST as code:\n" + asCodeString(ast));
    })

    test("generated code strings can be parsed again (excluding data expressions)", async () => {
        const ast = fromRandom(source, {Atom: 2, Str: 3, Data: 0, App: 5})

        const result = parseBotCode(asCodeString(ast))

        await simpleResultOutput(result, (x) => {
            console.log("Code: [" + asCodeString(ast) + "]")
            console.log(x)
        })

        const resultAst = await result
        const expectedAst = seq_(ast)
        assert(exprEquals(expectedAst, resultAst), expectedAst, resultAst)
    })
}

// todo. use property based testing: https://github.com/dubzzz/fast-check
// integration with jasmin: https://github.com/dubzzz/fast-check-examples/blob/main/test-jasmine/example.spec.js


