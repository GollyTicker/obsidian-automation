import {BotDefinition} from "./entities";
import * as P from "parsimmon";
import {Parser, whitespace} from "parsimmon";
import {toPromise} from "./extensions";

const SPECIAL_CHARS = ":%()\""

type BotAst = Atom

class Atom {
    constructor(public readonly name: string) {
    }

    toString() {
        return "Atom(" + this.name + ")"
    }
}

const BotLang = P.createLanguage({
    atom: function (r: any): Parser<Atom> {
        // todo. first example seems to not parse here.... TypeError for n.indexOf... continue here
        return P.noneOf(r.atomBreakers)
            .atLeast(1)
            .trim(P.optWhitespace)
            .map(strings => new Atom(strings.join("")));
    },
    atomBreakers: function (): Parser<string> {
        return P.oneOf(SPECIAL_CHARS).or(whitespace)
    }
})

export async function parseBot(botDef: BotDefinition): Promise<BotAst> {
    return toPromise(BotLang.atom.parse(botDef.code))
}

export function parsingExampleFromGitHub() {
    let CLI = P.createLanguage({
        expression: function (r: any) {
            // whitespace-separated words, strings and options
            return P.alt(r.word, r.string, r.option)
                .sepBy(P.whitespace)
                .trim(P.optWhitespace);
        },

        option: function (r: any) {
            // one of possible quotes, then sequence of anything except that quote (unless escaped), then the same quote
            return P.seq(
                P.alt(P.string("-").then(P.regex(/[a-z]/)), P.string("--").then(r.word)),
                P.alt(P.string("=").then(r.word), P.of(true))
            );
        },

        word: function () {
            // 1 char of anything except forbidden symbols and dash, then 0+ chars of anything except forbidden symbols
            return P.regex(/[^-=\s"'][^=\s"']*/);
        },

        string: function () {
            // one of possible quotes, then sequence of anything except that quote (unless escaped), then the same quote
            return P.oneOf(`"'`).chain(function (q) {
                return P.alt(
                    P.noneOf(`\\${q}`)
                        .atLeast(1)
                        .tie(), // everything but quote and escape sign
                    P.string(`\\`).then(P.any) // escape sequence like \"
                )
                    .many()
                    .tie()
                    .skip(P.string(q));
            });
        }
    });

    function prettyPrint(x: any) {
        // @ts-ignore
        let opts = {depth: null, colors: "auto"};
        let s = require('util').inspect(x, opts);
        console.log(s);
    }

    let ast = CLI.expression.tryParse("--some --thing=x");
    prettyPrint(ast);
}