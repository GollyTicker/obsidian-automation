import {BotDefinition} from "./entities";
import * as P from "parsimmon";
import {string} from "parsimmon";
import {regExpEscape, toPromise} from "./extensions";

const SPECIAL_CHARS = ":%()\""

const ATOM_BREAKER_REG_EXP_PART = regExpEscape(SPECIAL_CHARS) + "\\s"

const ATOM_BREAKER = new RegExp("[" + ATOM_BREAKER_REG_EXP_PART + "]")

const ATOM_CHAR = new RegExp("[^" + ATOM_BREAKER_REG_EXP_PART + "]");

const ATOM = new RegExp("[^" + ATOM_BREAKER_REG_EXP_PART + "]+");

type BotAst = Atom | Expr

interface Expr {

}

class App implements Expr {
    constructor(public readonly head: Expr, public readonly args: Expr[]) {
    }

    toString() {
        return "App(" + this.head.toString() + ", " + this.args.toString() + ")"
    }
}

class Atom implements Expr {
    constructor(public readonly name: string) {
    }

    toString() {
        return "Atom(" + this.name + ")"
    }
}

const BotLang = P.createLanguage<{
    line: BotAst,
    expr: Expr,
    subsequentArgList: Expr[],
    argListSep: '',
    exprs: Expr[],
    atom: Atom,
    colon: string
}>({
    colon: r => P.regexp(/:/),
    line: r => {
        return P.seq(
            r.expr,
            P.end.or(
                P.seq(P.lookahead(r.colon), r.subsequentArgList).map(t => t[1])
            )
        ).map(([head, optTail]) => {
            if (optTail instanceof string || optTail instanceof undefined) {
                // the head should be an atom here.
                return head; // todo. check and warn?
            } else {
                return new App(head, <Expr[]>optTail);
            }
        })
    },
    argListSep: r => P.string(",").wrap(P.optWhitespace, P.optWhitespace).result(''),
    subsequentArgList: r => P.seq(r.colon, P.end.or(P.sepBy(r.expr, r.argListSep))), // todo.
    exprs: r => P.string("todo").result(null),
    expr: r => {
        return r.atom; // todo.
    },
    atom: r => {
        return P.seq(
            P.optWhitespace, // todo. we only want non line-breaking whitespace
            P.regexp(ATOM),
            P.optWhitespace
        ).map(ss => new Atom(ss[1]));
    },
})

export async function parseBot(botDef: BotDefinition): Promise<BotAst> {
    return toPromise(BotLang.atom.parse(botDef.code), botDef.code)
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