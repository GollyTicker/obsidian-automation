import {test} from "../../tester/tester";
import {BotLang} from "./bot-lang-parser";

export const add = 0;

test("parser parses test expressions", () => {
    const codes = [
        "some-func",
        "123",
        "123:",
        "some-func: some-arg",
        "some-func: some-arg, another-arg",
        "some-func: some-arg, 123, 4532",

        "some-func: some-arg, 123, 4532\n" +
        "some-func: some-arg, 123, 4532",

        "some-func: some-arg 123 4532\n" +
        "some-func: some-arg 123 4532",

        "when: (a : b b) (c :d d) e",

        "when: (a: b b) (c: d d) e\n" +
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
        "when: (a: b b) (c: d ,d) ,e",

        "when: calc: plus, a, a\n" +
        "become: js-eval: something",

        "when: (calc:\n" +
        "plus), a, a\n" +
        "when: (calc: a s ,d\n" +
        "plus\n" +
        "s\n" +
        "d s\n" +
        ")\n" +
        "become: js-eval: something"
        //
        // "when: (calc: plus), a, a\n" +
        // "become: js-eval: something",

        // "when: calc: \"plus\", \"a,dvs sfS32fr=W%ra\"\n" +
        // "become: js-eval: something",
        //
        // "when: calc: plus, %a, var: b\n" +
        // "become: js-eval: %\"a + b\""
    ]
    codes.forEach(code => BotLang.botDefinition.tryParse(code))
})

// todo. actually test the created note

// todo. add negative tests