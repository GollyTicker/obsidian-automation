import P from "parsimmon";
import {app, Atom, atom, BotAst, CONCAT, Expr, exprEquals, mkVar, seq, Str, str, VAR} from "../ast";
import {spacesParser, WhiteSpaceType} from "./whitespace";
import {regExpEscape, toPromise} from "../../common/util";
import {BRACKET_CLOSE, BRACKET_OPEN, COLON, COMMA, DOUBLE_QUOTE, PERCENT, SPECIAL_CHARS_AST} from "./constants";
import {
    altB,
    BotParser,
    chainB,
    currentState,
    lazyChainB,
    mapB,
    mapStB,
    onSt,
    optionalOrElse,
    regexpB,
    result,
    runWithB,
    skipB,
    St,
    stringB,
    surroundB,
    thenB
} from "./bot-parser";
import {withLogs} from "./debug";
import {__} from "../../utils";
import {BOTLANG_STRING_ESCAPE_RULES, escapedToLiteral} from "./string";
import {fold} from "../transformation/base-definitions";

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

const comma = prefixOptSpacesB(regexpB(new RegExp(regExpEscape(COMMA))))

// IMPORTANT!! This method must be used to parse a percent to ensure, that
// the interpolation regime is recorded properly
const percent = prefixOptSpacesB(__(
    regexpB(new RegExp(PERCENT)),
    mapStB,
    encounteredVarPercent
))

const varAwareColon = (hd: Expr) => prefixOptSpacesB(__(
    regexpB(new RegExp(regExpEscape(COLON))),
    mapStB,
    (st: St) => __(hd, exprEquals, VAR) ? encounteredVarPercent(st) : st
))

const doubleQuote = regexpB(new RegExp(regExpEscape(DOUBLE_QUOTE)))

const bracketOpen = prefixOptSpacesB(__(
    regexpB(new RegExp(regExpEscape(BRACKET_OPEN))),
    mapStB,
    bracketDepthModifier(1)
))

const bracketClose = prefixOptSpacesB(__(
    regexpB(new RegExp(regExpEscape(BRACKET_CLOSE))),
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
    __(regexpB(ATOM), mapB, atom)
))

function parsedStringToStr(s: string): Str {
    return str(escapedToLiteral(s))
}

const STRING_BREAKER = regExpEscape(DOUBLE_QUOTE)
const STRING_ESCAPES = BOTLANG_STRING_ESCAPE_RULES.map((x) => regExpEscape(x[1]))
// = [ regExpEscape("\\\n"), regExpEscape("\\\t"), ... ]

const STRING = new RegExp(
    "(" + STRING_ESCAPES.join("|") + "|[^" + STRING_BREAKER + "])*"
)

const INTERPOL_STRING_PART_BREAKER = regExpEscape(DOUBLE_QUOTE + PERCENT)
const INTERPOL_STRING_PART = new RegExp(
    "(" + STRING_ESCAPES.join("|") + "|[^" + INTERPOL_STRING_PART_BREAKER + "])*"
)

function removeEmptyStrings(e: Expr[]): Expr[] {
    return e.filter((e) =>
        fold(() => true, (str) => str.length !== 0, () => true, () => true, e)
    )
}

// todo. add interpolated strings to folding and unfolding
// todo. add interpolated expressions to folding and unfolding
const interpolatingString: BotParser<Expr> = __(
    sequenceWithCombiner<Expr, Expr>(
        __(regexpB(INTERPOL_STRING_PART), mapB, parsedStringToStr),
        [{
            postHeadSep: () => exprDepthIncreaserB(altB(
                surroundB(__(percent, skipB, stringB(BRACKET_OPEN)), exprBL(), stringB(BRACKET_CLOSE)),
                __(percent, thenB, atomBL))),
            combiner: (x, interPolExpr, xs) => [x, mkVar(interPolExpr)].concat(xs)
        }]
    ),
    mapB,
    (elements: Expr[]) => app(CONCAT, removeEmptyStrings(elements))
)

// We are only in an interpolating regime on odd number of vars.
// See parser test cases.
function isInterpolating(st: St): boolean {
    return st.interpolationRegimes.length % 2 == 1
}

const stringBL: BotParser<Expr> = prefixOptSpacesB(
    surroundB(
        doubleQuote,
        __(currentState, chainB, (st: St) =>
            isInterpolating(st) ?
                interpolatingString :
                __(regexpB(STRING), mapB, parsedStringToStr)),
        doubleQuote),
)

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
            {postHeadSep: varAwareColon, combiner: (x: Expr, _, xs: Expr[]) => [app(x, xs)]},
            {postHeadSep: () => argListSeparator, combiner: (x: Expr, _, xs: Expr[]) => [x].concat(xs)}
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
                combiner: (x, _, xs) => [x].concat(xs)
            }]
        )

        const trimmedExpressionSequence = surroundB(
            spacesParser("optional", () => "w/newline"),
            __(expressionSequenceParser, mapB, seq),
            spacesParser("optional", () => "w/newline")
        )

        return __(trimmedExpressionSequence, runWithB, initialState).map(result)
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

// IMPORANT!! This function must e used whenever a new depth is entered. e.g. brackets, exprs, vars, ...
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

type Combiner<A, S> = (head: A, sep: S, tail: A[]) => A[]

/**
 * todo.
 */
function sequenceWithCombiner<A, S>(elt: BotParser<A>, sepAndCombiner: { postHeadSep: (h: A) => BotParser<S>, combiner: Combiner<A, S> }[]): BotParser<A[]> {

    const indexed: { sepi: (h: A) => BotParser<[S, number]>, combiner: Combiner<A, S> }[] =
        sepAndCombiner.map((obj, i) =>
            ({
                sepi: (h) => __(obj.postHeadSep(h), mapB, (res: S) => <[S, number]>[res, i]),
                combiner: obj.combiner
            })
        )

    const anySepParser = (head: A) => altB(...indexed.map(o => o.sepi(head)))

    function parseSepAndTailAndCombine(head: A, recursiveTailParser: () => BotParser<A[]>): BotParser<A[]> {
        return __(anySepParser(head), chainB, ([sep, i]: [S, number]) => __(
            recursiveTailParser(),
            mapB,
            (tail: A[]) => indexed[i].combiner(head, sep, tail)
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

