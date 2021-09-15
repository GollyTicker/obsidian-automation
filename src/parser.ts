import {BotDefinition} from "./entities";
import * as P from "parsimmon";
import {Parser} from "parsimmon";
import {regExpEscape, toPromise} from "./extensions";

const SPECIAL_CHARS = ":%()\""

const ATOM_BREAKER_REG_EXP_PART = regExpEscape(SPECIAL_CHARS) + "\\s"

const ATOM_BREAKER = new RegExp("[" + ATOM_BREAKER_REG_EXP_PART + "]")

const ATOM_CHAR = new RegExp("[^" + ATOM_BREAKER_REG_EXP_PART + "]");

const ATOM = new RegExp("[^" + ATOM_BREAKER_REG_EXP_PART + "]+");

type BotAst = Seq

const seq = (exprs: Expr[]) => new Seq(exprs);
const atom = (name: string) => new Atom(name);
const app = (head: Expr, tail: Expr[]) => new App(head, tail);

interface Expr {
    toString(): string
}

class App implements Expr {
    constructor(public readonly head: Expr, public readonly args: Expr[]) {
    }

    toString() {
        return "App(" + this.head.toString() + ", " + this.args.toString() + ")"
    }
}

class Seq extends App {
    constructor(public readonly args: Expr[]) {
        super("sequence", args);
    }

    toString(): string {
        return "Sequence(" + this.args.toString() + ")";
    }
}

class Atom implements Expr {
    constructor(public readonly name: string) {
    }

    toString() {
        return "Atom(" + this.name + ")"
    }
}

function end<T>(): Parser<T[]> {
    return P.end.result([]);
}

/* ================= !! IMPORTANT !! ======================
The types in @types/parsimmon are older than the actual parser used!
Check against the API at https://github.com/jneen/parsimmon/blob/master/API.md
to be sure.
*/


const BotLang = P.createLanguage<{
    botDefinition: BotAst,
    line: Expr,
    expr: Expr,
    subsequentArgListWithColonPrefix: Expr[],
    argList: Expr[],
    atom: Atom,
    colon: string
}>({
    botDefinition: r => r.line.map(e => seq([e])),
    colon: r => P.regexp(/:/),
    line: r => {
        return P.seq(
            r.expr,
            P.seq(P.lookahead(r.colon), r.subsequentArgListWithColonPrefix)
                .map(t => t[1])
                .or(end<Expr>())
        ).chain(convertHeadAndOptionalTailToExpr);
    },
    subsequentArgListWithColonPrefix: r => P.seq(r.colon, r.argList.or(end())),
    argList: r => P.sepBy(r.expr, argListSeparator),
    expr: r => {
        return r.atom; // todo.
    },
    atom: r => {
        return P.seq(
            P.optWhitespace,
            P.regexp(ATOM),
            optWhitespace
        ).map(ss => atom(ss[1]));
    },
})

function convertHeadAndOptionalTailToExpr([head, optTail]: [Expr, Expr[]]): Parser<Expr> {
    if (optTail.length == 0) {
        // the head should be an atom here.
        return P.succeed(head);
    } else {
        return P.succeed(app(head, optTail));
    }
}

// We only want to use non newline whitespace
const optWhitespace = P.regexp(/^[ \t]*/)

const argListSeparator: Parser<any> = P.string(",").wrap(optWhitespace, optWhitespace);


export async function parseBot(botDef: BotDefinition): Promise<BotAst> {
    return toPromise(BotLang.botDefinition.parse(botDef.code), botDef.code)
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