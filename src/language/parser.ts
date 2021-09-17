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

const ATOM = new RegExp("[^" + ATOM_BREAKER_REG_EXP_PART + "]+");

/* ================= !! IMPORTANT !! ======================
The types in @types/parsimmon are older than the actual parser used!
Check against the API at https://github.com/jneen/parsimmon/blob/master/API.md
to be sure.
*/

function seqByRightAssoc<A>(elt: Parser<A>, sepCombiner: { sep: Parser<string>, combiner: (head: A, tail: A[]) => A }[]): Parser<A[]> {
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
    argList: r => {
        return seqByRightAssoc(
            r.expr, [
                {sep: colon, combiner: app},
                {sep: argListSeparator, combiner: (x, xs) => [x].concat(xs)}
            ])
    },
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