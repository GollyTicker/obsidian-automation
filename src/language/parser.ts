import {BotDefinition} from "../entities";
import * as P from "parsimmon";
import {Mark, Parser} from "parsimmon";
import {app, atom, Atom, BotAst, Expr, seq} from "./ast";
import {optional, optSimpleWhitespace} from "./utils";
import {regExpEscape, toPromise} from "../util";

export async function parseBot(botDef: BotDefinition): Promise<BotAst> {
    return toPromise(BotLang.botDefinition.parse(botDef.code), botDef.code)
}

const SPECIAL_CHARS = ":,%()\""

const ATOM_BREAKER_REG_EXP_PART = regExpEscape(SPECIAL_CHARS) + "\\s"

const ATOM_BREAKER = new RegExp("[" + ATOM_BREAKER_REG_EXP_PART + "]")

const ATOM_CHAR = new RegExp("[^" + ATOM_BREAKER_REG_EXP_PART + "]");

const ATOM = new RegExp("[^" + ATOM_BREAKER_REG_EXP_PART + "]+");

/* ================= !! IMPORTANT !! ======================
The types in @types/parsimmon are older than the actual parser used!
Check against the API at https://github.com/jneen/parsimmon/blob/master/API.md
to be sure.
*/

const BotLang = P.createLanguage<{
    botDefinition: BotAst,
    line: Expr,
    expr: Expr,
    argList: Expr[],
    colonPrefixedOptionalArgList: Expr[],
    atom: Atom,
}>({
    botDefinition: r => P.sepBy(r.line, P.optWhitespace).skip(P.end).map(seq),
    line: r => {
        return P.seq(r.expr, optional(r.colonPrefixedOptionalArgList))
            .chain(headAndOptionalTailToExpr);
    },
    colonPrefixedOptionalArgList: r => colon.then(r.argList),
    argList: r => P.sepBy(r.expr, argListSeparator),
    expr: r => {
        return r.atom; // todo.
    },
    atom: ignored => P.optWhitespace.then(P.regexp(ATOM)).map(atom),
})

function headAndOptionalTailToExpr([head, optTail]: [Expr, "" | Expr[]]): Parser<Expr> {
    if (optTail === "") {
        // the head should be an atom here.
        return P.succeed(head);
    } else {
        return P.succeed(app(head, optTail));
    }
}

const argListSeparator: Parser<any> = optSimpleWhitespace
    .then(P.regexp(/,/))
    .skip(optSimpleWhitespace)

const colon = P.regexp(/:/)

function debugLog<T>(str: string) {
    return (m: Mark<T>) => {
        console.log(str, m.start, m.end);
        return m.value;
    };
}