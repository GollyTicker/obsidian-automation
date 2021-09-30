import * as P from "parsimmon";
import {app, Atom, atom, BotAst, Expr, exprEquals, seq, str, Str, VAR} from "../ast";
import {spacesParser, WhiteSpaceType} from "./whitespace";
import {regExpEscape, toPromise} from "../../common/util";
import {BRACKET_CLOSE, BRACKET_OPEN, COLON, COMMA, DOUBLE_QUOTE, PERCENT, SPECIAL_CHARS_AST} from "./constants";
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
import {__} from "../../utils";
import {BOTLANG_STRING_ESCAPE_RULES, toLiteral} from "./string";

export async function parseBotCode(code: string): Promise<BotAst> {
    return toPromise(BotLang.definition.parse(code), code)
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

const percent = prefixOptSpacesB(__(
    regexp(new RegExp(PERCENT)),
    mapStB,
    encounteredVarPercent
))

const varAwareColon = (hd: Expr) => prefixOptSpacesB(__(
    regexp(new RegExp(regExpEscape(COLON))),
    mapStB,
    (st: St) => __(hd, exprEquals, VAR) ? encounteredVarPercent(st) : st
))

const doubleQuote = regexp(new RegExp(regExpEscape(DOUBLE_QUOTE)))

const bracketOpen = prefixOptSpacesB(__(
    regexp(new RegExp(regExpEscape(BRACKET_OPEN))),
    mapStB,
    bracketDepthModifier(1)
))

const bracketClose = prefixOptSpacesB(__(
    regexp(new RegExp(regExpEscape(BRACKET_CLOSE))),
    mapStB,
    bracketDepthModifier(-1)
))

function whiteSpaceType(st: St): WhiteSpaceType {
    return st.bracketDepth >= 1 ? 'w/newline' : 'simple'
}

const argListSeparator = altB(comma, spacesParser('mandatory', whiteSpaceType))

// ======================= main definitions =======================

const ATOM_BREAKER_REG_EXP_PART = regExpEscape(SPECIAL_CHARS_AST) + "\\s"

const ATOM = new RegExp("[^" + ATOM_BREAKER_REG_EXP_PART + "]+")

const atomBL: BotParser<Atom> = withLogs<Atom>("atom")(prefixOptSpacesB(
    __(regexp(ATOM), mapB, atom)
))

const STRING_BREAKER = regExpEscape(DOUBLE_QUOTE)
const STRING_ESCAPES = BOTLANG_STRING_ESCAPE_RULES.map((x) => regExpEscape(x[1]))
// = [ regExpEscape("\\\n"), regExpEscape("\\\t"), ... ]

const STRING = new RegExp(
    "(" + STRING_ESCAPES.join("|") + "|[^" + STRING_BREAKER + "])*"
)

// todo. we need interpolation regimes, so that we can properly parse a % string as either
// var or as a normal string.

// todo. write interpolating variant of string
const stringBL: BotParser<Str> = prefixOptSpacesB(__(
    surroundB(doubleQuote, regexp(STRING), doubleQuote),
    mapB,
    (x: string) => str(toLiteral(x))
))

// ( (exprBL) | atomBL | "str" | %exprBL ) (: argListBL)?
function exprBL(): BotParser<Expr> {

    function head(): BotParser<Expr> {
        const nonInterpolatingExpr = altB<Expr>(atomBL, bracketExpr(), stringBL)

        const interpolatingExpr = exprDepthIncreaserB(__(
            percent,
            thenB,
            __(nonInterpolatingExpr, mapB, (e: Expr) => app(VAR, [e]))
        ))
        return altB(interpolatingExpr, nonInterpolatingExpr)
    }

    function bracketExpr() {
        return withLogs<Expr>("bracketExpr")(surroundB(bracketOpen, exprBL(), bracketClose))
    }

    const optColonPrefixedArgList = (hd: Expr) => {
        const colonArgList = __(varAwareColon(hd), thenB,
            __(argListBL(), mapB, (tl: Expr[]) => app(hd, tl))
        )

        return __(colonArgList, optionalOrElse, hd)
    }

    return withLogs<Expr>("expr")(prefixOptSpacesB(
        exprDepthIncreaserB(
            __(head, lazyChainB, optColonPrefixedArgList)
        )
    ))
}

const argListBL: () => BotParser<Expr[]> = () => withLogs<Expr[]>("argList")(
    sequenceWithCombiner(
        exprBL(),
        [
            {postHeadSep: varAwareColon, combiner: (x: Expr, xs: Expr[]) => [app(x, xs)]},
            {postHeadSep: () => argListSeparator, combiner: (x: Expr, xs: Expr[]) => [x].concat(xs)}
        ] // sequenceWithCombiner can be used to simulate right-associative parsing
    )
)

// ================= BotLang entrypoint ===================

const initialState: St = {
    bracketDepth: 0,
    expressionDepth: 0,
    interpolationRegimes: []
}

export const BotLang = P.createLanguage<{ definition: BotAst }>({
    definition: () => {
        const expressionSequenceParser = sequenceWithCombiner(exprBL(),
            [{
                postHeadSep: () => spacesParser("mandatory", () => "w/newline"),
                combiner: (x, xs) => [x].concat(xs)
            }]
        )

        const trimmedExpressionSequence = surroundB(
            spacesParser("optional", () => "w/newline"),
            __(expressionSequenceParser, mapB, seq),
            spacesParser("optional", () => "w/newline")
        )

        return __(trimmedExpressionSequence, runWith, initialState).map(result)
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
    return __(spacesParser('optional', whiteSpaceType), thenB, parser)
}

type Combiner<A> = (head: A, tail: A[]) => A[]

/**
 * todo.
 */
function sequenceWithCombiner<A>(elt: BotParser<A>, sepAndCombiner: { postHeadSep: (h: A) => BotParser<any>, combiner: Combiner<A> }[]): BotParser<A[]> {

    const indexed: { sepi: (h: A) => BotParser<number>, combiner: Combiner<A> }[] =
        sepAndCombiner.map((obj, i) =>
            ({
                sepi: (h) => withResultB(obj.postHeadSep(h), i),
                combiner: obj.combiner
            })
        )

    const anySepParser = (head: A) => altB(...indexed.map(o => o.sepi(head)))

    function parseSepAndTailAndCombine(head: A, recursiveTailParser: () => BotParser<A[]>): BotParser<A[]> {
        return __(anySepParser(head), chainB, (i: number) => __(
            recursiveTailParser(),
            mapB,
            (tail: A[]) => indexed[i].combiner(head, tail)
        ))
    }

    function recursiveSequenceParser(): BotParser<A[]> {
        const list = __(elt, chainB, (head: A) => __(
            parseSepAndTailAndCombine(head, recursiveSequenceParser),
            optionalOrElse,
            [head]
        ))

        return __(list, optionalOrElse, [])
    }

    return recursiveSequenceParser()
}

