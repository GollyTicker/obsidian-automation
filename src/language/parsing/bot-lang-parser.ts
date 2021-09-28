import {BotDefinition} from "../../entities";
import * as P from "parsimmon";
import {app, Atom, atom, BotAst, Expr, exprEquals, seq, str, Str, VAR_ATOM} from "../ast";
import {spacesParser, WhiteSpaceType} from "./whitespace";
import {regExpEscape, toPromise} from "../../common/util";
import {BACKSLASH, BRACKET_CLOSE, BRACKET_OPEN, COLON, COMMA, DOUBLE_QUOTE, PERCENT, SPECIAL_CHARS} from "./constants";
import {
    altB,
    BotParser,
    chainB,
    lazyChainB,
    mapB,
    mapStB,
    onSt,
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

const comma = prefixOptSpacesB(regexp(new RegExp(regExpEscape(COMMA))))

const percent = prefixOptSpacesB($$(
    regexp(new RegExp(PERCENT)),
    mapStB,
    encounteredVarPercent
))

const colon = (hd: Expr) => prefixOptSpacesB($$(
    regexp(new RegExp(regExpEscape(COLON))),
    mapStB,
    (st: St) => $$(hd, exprEquals, VAR_ATOM) ? encounteredVarPercent(st) : st
))

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

function whiteSpaceType(st: St): WhiteSpaceType {
    return st.bracketDepth >= 1 ? 'w/newline' : 'simple'
}

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

// todo. we need interpolation regimes, so that we can properly parse a % string as either
// var or as a normal string.

// todo. write interpolating variant of string
const stringBL: BotParser<Str> = prefixOptSpacesB($$(
    surroundB(doubleQuote, regexp(STRING), doubleQuote),
    mapB,
    (x: string) => str(toLiteral(x))
))

// ( (exprBL) | atomBL | "str" | %exprBL ) (: argListBL)?
function exprBL(): BotParser<Expr> {

    function head(): BotParser<Expr> {
        const nonInterpolatingExpr = altB<Expr>(
            atomBL,
            surroundB(bracketOpen, exprBL(), bracketClose),
            stringBL,
        )
        const interpolatingExpr = exprDepthIncreaserB($$(
            percent,
            thenB,
            $$(nonInterpolatingExpr, mapB, (e: Expr) => app(VAR_ATOM, [e]))
        ))
        return altB(interpolatingExpr, nonInterpolatingExpr)
    }

    const optColonPrefixedArgList = (hd: Expr) => {
        const colonArgList = $$(colon(hd), thenB,
            $$(argListBL(), mapB, (tl: Expr[]) => app(hd, tl))
        )

        return $$(colonArgList, optionalOrElse, hd)
    }

    return withLogs<Expr>("expr")(prefixOptSpacesB(
        exprDepthIncreaserB(
            $$(head, lazyChainB, optColonPrefixedArgList)
        )
    ))
}

const argListBL: () => BotParser<Expr[]> = () => withLogs<Expr[]>("argList")(
    seqByRightAssocB(
        exprBL(),
        [
            {sep: colon, combiner: (x: Expr, xs: Expr[]) => [app(x, xs)]},
            {sep: () => argListSeparator, combiner: (x: Expr, xs: Expr[]) => [x].concat(xs)}
        ]
    )
)

// ================= BotLang entrypoint ===================

const initialState: St = {
    bracketDepth: 0,
    expressionDepth: 0,
    interpolationRegimes: []
}

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

function encounteredVarPercent(st: St): St {
    return {...st, interpolationRegimes: st.interpolationRegimes.concat([st.expressionDepth])}
}

function ensureActiveInterpolationRegimesConstraint(st: St): St {
    return {...st, interpolationRegimes: st.interpolationRegimes.filter((itpDepth) => itpDepth <= st.expressionDepth)}
}

function exprDepthModifier(i: number): (st: St) => St {
    return (st) => ensureActiveInterpolationRegimesConstraint(
        {...st, expressionDepth: st.expressionDepth + i}
    )
}

function exprDepthIncreaserB<T>(parser: BotParser<T>): BotParser<T> {
    return surroundB(
        onSt(exprDepthModifier(1)),
        parser,
        onSt(exprDepthModifier(-1))
    )
}

function prefixOptSpacesB<T>(parser: BotParser<T>): BotParser<T> {
    return $$(spacesParser('optional', whiteSpaceType), thenB, parser)
}

type Combiner<A> = (head: A, tail: A[]) => A[]

function seqByRightAssocB<A>(elt: BotParser<A>, sepCombiner: { sep: (h: A) => BotParser<string>, combiner: Combiner<A> }[]): BotParser<A[]> {

    const indexed: { sepi: (h: A) => BotParser<number>, combiner: Combiner<A> }[] =
        sepCombiner.map((obj, i) =>
            ({
                sepi: (h) => withResultB(obj.sep(h), i),
                combiner: obj.combiner
            })
        )

    const anySepParser = (head: A) => altB(...indexed.map(o => o.sepi(head)))

    function parseSepAndTailAndCombineWith(head: A, recursiveTailParser: () => BotParser<A[]>): BotParser<A[]> {
        return $$(anySepParser(head), chainB, (i: number) => $$(
            recursiveTailParser(),
            mapB,
            (tail: A[]) => indexed[i].combiner(head, tail)
        ))
    }

    function recursiveRightAssociativeParser(): BotParser<A[]> {
        const list = $$(elt, chainB, (head: A) => $$(
            parseSepAndTailAndCombineWith(head, recursiveRightAssociativeParser),
            optionalOrElse,
            [head]
        ))

        return $$(list, optionalOrElse, [])
    }

    return recursiveRightAssociativeParser()
}

