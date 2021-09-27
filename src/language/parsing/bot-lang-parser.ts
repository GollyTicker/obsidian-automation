import {BotDefinition} from "../../entities";
import * as P from "parsimmon";
import {app, Atom, atom, BotAst, Expr, seq, str, Str} from "../ast";
import {spacesParser, WhiteSpaceType} from "./whitespace";
import {regExpEscape, toPromise} from "../../common/util";
import {BACKSLASH, BRACKET_CLOSE, BRACKET_OPEN, COLON, COMMA, DOUBLE_QUOTE, SPECIAL_CHARS} from "./constants";
import {
    altB,
    BotParser,
    chainB,
    lazyChainB,
    mapB,
    mapStB,
    optionalOrElse,
    regexp,
    result,
    runWith,
    St,
    surroundB,
    thenB,
    withResultB
} from "./bot-parser";
import {withLogs} from "./debug";
import {$$} from "../../utils";
import {toLiteral} from "./string";

export async function parseBot(botDef: BotDefinition): Promise<BotAst> {
    return toPromise(BotLang.botDefinition.parse(botDef.code), botDef.code)
}

/*
* Important Constraints for Parsers:
* * Each PARSER must consume any prefixing whitespace itself. Suffix whitespace is not of its concern.
*   To achieve that, prefixOptSpacesB(parser) can be called
* * Each PARSER is stateful and is of type BotParser<T> = (state:St) => Parser<[T,St]>.
*   The state is used to parameterize the parsing. Each parser hands over a (possibly different) state to
*   its descendents and children.
* */

// ================ basic definitions ====================

function whiteSpaceType(st: St): WhiteSpaceType {
    return st.bracketDepth >= 1 ? 'w/newline' : 'simple'
}

const comma = prefixOptSpacesB(regexp(new RegExp(regExpEscape(COMMA))))

const colon = prefixOptSpacesB(regexp(new RegExp(regExpEscape(COLON))))

const doubleQuote = regexp(new RegExp(regExpEscape(DOUBLE_QUOTE)))

const bracketOpen = prefixOptSpacesB($$(
    regexp(new RegExp(regExpEscape(BRACKET_OPEN))),
    mapStB,
    bracketDepthModifier(1)
))

const bracketClose = prefixOptSpacesB($$(
    regexp(new RegExp(regExpEscape(BRACKET_CLOSE))),
    mapStB,
    bracketDepthModifier(-1)
))

const argListSeparator = altB(comma, spacesParser('mandatory', whiteSpaceType))


// ======================= main definitions =======================

const ATOM_BREAKER_REG_EXP_PART = regExpEscape(SPECIAL_CHARS) + "\\s"

const ATOM = new RegExp("[^" + ATOM_BREAKER_REG_EXP_PART + "]+")

const atomBL: BotParser<Atom> = withLogs<Atom>("atom")(prefixOptSpacesB(
    $$(regexp(ATOM), mapB, atom)
))

const STRING_BREAKER = regExpEscape(DOUBLE_QUOTE)
const STRING_ESCAPED_QUOTE = regExpEscape(BACKSLASH + DOUBLE_QUOTE)

const STRING = new RegExp(
    "(" + STRING_ESCAPED_QUOTE + "|[^" + STRING_BREAKER + "])*"
)

const stringBL: BotParser<Str> = prefixOptSpacesB($$(
    surroundB(doubleQuote,
        regexp(STRING),
        doubleQuote),
    mapB,
    (x: string) => str(toLiteral(x))
))


// ( (exprBL) | atomBL | "str" | %exprBL ) (: argListBL)?
function exprBL(): BotParser<Expr> {

    function head(): BotParser<Expr> {
        return altB<Expr>(
            atomBL,
            surroundB(bracketOpen, exprBL(), bracketClose),
            stringBL
        )
    }

    const optColonPrefixedArgList = (hd: Expr) => {
        const colonArgList = $$(colon, thenB,
            $$(argListBL(), mapB, (tl: Expr[]) => app(hd, tl))
        )

        return $$(colonArgList, optionalOrElse, hd)
    }

    return withLogs<Expr>("expr")(prefixOptSpacesB(
        $$(head, lazyChainB, optColonPrefixedArgList)
    ))
}

const argListBL: () => BotParser<Expr[]> = () => withLogs<Expr[]>("argList")(
    seqByRightAssocB(
        exprBL(),
        [
            {sep: colon, combiner: (x: Expr, xs: Expr[]) => [app(x, xs)]},
            {sep: argListSeparator, combiner: (x: Expr, xs: Expr[]) => [x].concat(xs)}
        ]
    )
)

// ================= BotLang entrypoint ===================

const initialState: St = {bracketDepth: 0}

export const BotLang = P.createLanguage<{ botDefinition: BotAst }>({
    botDefinition: () => {
        const expressionParser = $$(exprBL(), runWith, initialState).map(result)
        return P.sepBy(expressionParser, P.optWhitespace)
            .skip(P.end)
            .map(seq)
    }
})


// ===================== functions ========================

function bracketDepthModifier(i: number): (st: St) => St {
    return (st) => ({...st, bracketDepth: st.bracketDepth + i})
}

function prefixOptSpacesB<T>(parser: BotParser<T>): BotParser<T> {
    return $$(spacesParser('optional', whiteSpaceType), thenB, parser)
}

type Combiner<A> = (head: A, tail: A[]) => A[]

function seqByRightAssocB<A>(elt: BotParser<A>, sepCombiner: { sep: BotParser<string>, combiner: Combiner<A> }[]): BotParser<A[]> {

    const indexed: { sepi: BotParser<number>, combiner: Combiner<A> }[] =
        sepCombiner.map((obj, i) =>
            ({
                sepi: withResultB(obj.sep, i),
                combiner: obj.combiner
            })
        )

    const anySepParser = altB(...indexed.map(o => o.sepi))

    function parseSepAndTailAndCombineWith(head: A, recursiveTailParser: () => BotParser<A[]>): BotParser<A[]> {
        return chainB(
            anySepParser,
            (i) => $$(
                recursiveTailParser(),
                mapB,
                (tail: A[]) => indexed[i].combiner(head, tail)
            )
        )
    }

    function recursiveRightAssociativeParser(): BotParser<A[]> {
        const list = $$(elt, chainB, (head: A) =>
            $$(
                parseSepAndTailAndCombineWith(head, recursiveRightAssociativeParser),
                optionalOrElse,
                [head]
            )
        )

        return $$(list, optionalOrElse, [])
    }

    return recursiveRightAssociativeParser()
}

