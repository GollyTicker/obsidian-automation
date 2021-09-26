import {app, atom} from "../ast";
import {assert, test} from "../../tester/tester";
import {random} from "../../common/random";
import {fold} from "./base-definitions";
import {asCodeString, asIndentedString} from "./foldings";
import {fromRandom} from "./unfoldings";

export const add = 0;

test("fold works", () => {
    const ast = atom("sdfsd")
    const left = fold<number>(x => x.length, () => 0, ast)
    assert(left === 5, left, 5)
})

test("showcase indented string", () => {
    const asts = [
        atom("sdf"),
        app(atom("sdf"), [atom("2")]),
        app(atom("sdf"), [atom("2"), atom("3")]),
        app(atom("sdf"), [app(atom("2"), []), atom("3")]),
        app(atom("sdf"), [app(atom("2"), [atom("2"), atom("3")])]),
        app(app(atom("2"), [atom("2"), atom("3")]), [app(atom("2"), [app(atom("2"), [atom("2"), atom("3")]), atom("3")]), atom("3"), atom("3")])
    ]

    asts.forEach(ast => {
        console.log(asIndentedString(ast, false));
    })

    asts.forEach(ast => {
        console.log(asIndentedString(ast, true));
    })
})

test("showcase AST generation", () => {
    for (let i = 0; i < 6; i++) {
        console.log("Generated string:\n" +
            asIndentedString(
                fromRandom(
                    random("2qc3" + i)
                ),
                true
            )
        );

        console.log("Same AST as code:\n" +
            asCodeString(
                fromRandom(
                    random("2qc3" + i)
                )
            )
        );
    }
})

// todo. use property based testing: https://github.com/dubzzz/fast-check
// integration with jasmin: https://github.com/dubzzz/fast-check-examples/blob/main/test-jasmine/example.spec.js


