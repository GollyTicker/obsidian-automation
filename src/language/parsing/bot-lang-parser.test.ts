import {test} from "../../tester/tester";
import {BotLang} from "./bot-lang-parser";

export const add = 0;

test("parser parses test expressions", () => {
    const codes: { [p: string]: null } = {
        "some-func": null,
        "123": null,
        "123:": null,
        "some-func: some-arg": null,
        "some-func: some-arg: null, another-arg": null,
        "some-func: some-arg, 123, 4532": null,

        ["some-func: some-arg, 123, 4532\n" +
        "some-func: some-arg, 123, 4532"]: null,

        ["some-func: some-arg 123 4532\n" +
        "some-func: some-arg 123 4532"]: null,

        "when: (a : b b) (c :d d) e": null,

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
        "when: (a: b b) (c: d ,d) ,e"]: null,

        ["when: calc: plus, a, a\n" +
        "become: js-eval: something"]: null,

        ["when: (calc:\n" +
        "plus), a, a\n" +
        "when: (calc: a s ,d\n" +
        "plus\n" +
        "s\n" +
        "d s\n" +
        ")\n" +
        "become: js-eval: something"]: null,

        ["when: (calc: plus), a, a\n" +
        "become: js-eval: something"]: null,

        ["when: calc: \"plus\": null, \"a,dvs sfS32fr=W%ra\"\n" +
        "become: js-eval: something"]: null,

        ['when: calc: "plus": null, "a,dvs \\nsfS32fr=W%ra"\n' +
        'a: 000000011111111112\n' +
        'a: 345678901234567890\n' +
        'when: calc: "plus" , "a,dvs \\nsfS32fr=W%ra"\n' +
        'when: calc: "plus" ,"a,dvs \\nsfS32fr=W%ra"\n' +
        'when: calc: "pls\n' +
        '\tt\\\\\n' +
        'nl\\"\n' +
        '"']: null,

        ["when: calc: plus, %a, var: b\n" +
        "become: js-eval: %\"%a + b\""]: null,

        ["when: calc: plus, %a, var: b\n" +
        "become: js-eval: %\"%a + %b\""]: null,

        ["when: calc: plus, %a, var: b\n" +
        "become: js-eval: %\"%(a: b) + %b\""]: null,

        ["when: calc: plus, %a, %b\n" +
        "become: js-eval: %\"%a + b\""]: null,

        ["associations: (a: 3, b: 5)\n" +
        "js-eval: %\"%a + %b\""]: null,

        "sequence: (when: %pattern), (become: %expr)": null,
    }

    for (const code in codes) {
        const ast = BotLang.botDefinition.tryParse(code)
        console.assert(ast)
    }
})

// todo. add tests which test for ast structure

// todo. add negative tests