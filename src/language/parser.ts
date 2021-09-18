import {BotDefinition} from "../entities";
import * as P from "parsimmon";
import {Mark, Parser} from "parsimmon";
import {app, Atom, atom, BotAst, Expr, seq} from "./ast";
import {optional, optSimpleWhitespace} from "./utils";
import {regExpEscape, toPromise} from "../common/util";
import {BRACKET_CLOSE, BRACKET_OPEN, COLON, COMMA, SPECIAL_CHARS} from "./constants";

export async function parseBot(botDef: BotDefinition): Promise<BotAst> {
    return toPromise(BotLang.botDefinition.parse(botDef.code), botDef.code)
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
    atom: Atom,
    argList: Expr[],
    colonPrefixedOptionalArgList: Expr[],
}>({
    botDefinition: r => P.sepBy(r.line, P.optWhitespace).skip(P.end).map(seq),
    line: r => {
        return r.expr;
    },
    // todo. should we allow spaces between the atom/Expr and the colon?
    colonPrefixedOptionalArgList: r => colon.then(r.argList),
    argList: r => {
        return seqByRightAssoc(
            r.expr, [
                {sep: colon, combiner: (x, xs) => [app(x, xs)]},
                {sep: argListSeparator, combiner: (x, xs) => [x].concat(xs)}
            ])
    },
    expr: r => {
        return P.seq(
            P.alt(
                // (expr) | Atom | "str" | %expr
                r.atom,
                r.expr.wrap(bracketOpen.skip(optSimpleWhitespace), optSimpleWhitespace.skip(bracketClose)),
            ),
            optional(r.colonPrefixedOptionalArgList) // if : then argList => App
        ).map(combineWithOptionalArgList)
    },
    atom: ignored => P.optWhitespace.then(P.regexp(ATOM)).map(atom),
})

const combineWithOptionalArgList = (result: [Expr, "" | Expr[]]) => {
    return result[1] === "" ? result[0] : app(result[0], result[1])
}

const ATOM_BREAKER_REG_EXP_PART = regExpEscape(SPECIAL_CHARS) + "\\s"

const ATOM = new RegExp("[^" + ATOM_BREAKER_REG_EXP_PART + "]+");

const comma = P.regexp(new RegExp(regExpEscape(COMMA)))

const colon = P.regexp(new RegExp(regExpEscape(COLON)))

const bracketOpen = P.regexp(new RegExp(regExpEscape(BRACKET_OPEN)))

const bracketClose = P.regexp(new RegExp(regExpEscape(BRACKET_CLOSE)))

const argListSeparator: Parser<any> = optSimpleWhitespace
    .then(comma)
    .skip(optSimpleWhitespace)


function seqByRightAssoc<A>(elt: Parser<A>, sepCombiner: { sep: Parser<string>, combiner: (head: A, tail: A[]) => A[] }[]): Parser<A[]> {
    const indexed = sepCombiner.map((obj, i) =>
        ({sepi: obj.sep.result(i), combiner: obj.combiner})
    )

    const fallbackEmptyList = P.succeed([])

    const anySepParser = P.alt(...indexed.map(o => o.sepi))

    function parseSepAndTailAndCombineWith(head: A, recursiveTailParser: () => Parser<A[]>) {
        return anySepParser.chain(i =>
            P.lazy(recursiveTailParser).map(tail => indexed[i].combiner(head, tail))
        )
    }

    function recursiveRightAssociativeParser(): Parser<A[]> {
        return P.alt(
            elt.chain(head =>
                P.alt(
                    parseSepAndTailAndCombineWith(head, recursiveRightAssociativeParser),
                    P.succeed([head])
                )
            ),
            fallbackEmptyList
        )
    }

    return recursiveRightAssociativeParser()
}

function debugLog<T>(str: string) {
    return (m: Mark<T>) => {
        console.log(str, m.start, m.end);
        return m.value;
    };
}