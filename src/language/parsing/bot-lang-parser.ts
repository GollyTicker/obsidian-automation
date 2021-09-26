import {BotDefinition} from "../../entities";
import * as P from "parsimmon";
import {app, Atom, atom, BotAst, Expr, seq} from "../ast";
import {spacesParser, WhiteSpaceType} from "./whitespace";
import {regExpEscape, toPromise} from "../../common/util";
import {BRACKET_CLOSE, BRACKET_OPEN, COLON, COMMA, SPECIAL_CHARS} from "./constants";
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
    run,
    St,
    surroundB,
    thenB,
    withResultB
} from "./bot-parser";
import {withLogs} from "./debug";

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

const bracketOpen = prefixOptSpacesB(
    mapStB(
        regexp(new RegExp(regExpEscape(BRACKET_OPEN))),
        bracketDepthModifier(1)
    )
)

const bracketClose = prefixOptSpacesB(
    mapStB(
        regexp(new RegExp(regExpEscape(BRACKET_CLOSE))),
        bracketDepthModifier(-1)
    )
)

const argListSeparator = altB(comma, spacesParser('mandatory', whiteSpaceType))


// ======================= main definitions =======================

const ATOM_BREAKER_REG_EXP_PART = regExpEscape(SPECIAL_CHARS) + "\\s"

const ATOM = new RegExp("[^" + ATOM_BREAKER_REG_EXP_PART + "]+")

const atomBL: BotParser<Atom> = withLogs<Atom>("atom")(prefixOptSpacesB(
    mapB(regexp(ATOM), atom)
))


// ( (exprBL) | atomBL | "str" | %exprBL ) (: argListBL)?
function exprBL(): BotParser<Expr> {

    function head(): BotParser<Expr> {
        return altB<Expr>(atomBL,
            surroundB(bracketOpen, exprBL(), bracketClose)
        )
    }

    const optColonPrefixedArgList = (hd: Expr) => {
        const colonArgList = thenB(colon,
            mapB(argListBL(), tl => app(hd, tl))
        )

        return optionalOrElse<Expr>(colonArgList, hd)
    }

    return withLogs<Expr>("expr")(prefixOptSpacesB(
        lazyChainB(head, optColonPrefixedArgList)
    ))
}

function argListBL(): BotParser<Expr[]> {
    return withLogs<Expr[]>("argList")(seqByRightAssocB(
        exprBL(),
        [
            {sep: colon, combiner: (x: Expr, xs: Expr[]) => [app(x, xs)]},
            {sep: argListSeparator, combiner: (x: Expr, xs: Expr[]) => [x].concat(xs)}
        ]
    ))
}

// ================= BotLang entrypoint ===================

const initialState: St = {bracketDepth: 0}

export const BotLang = P.createLanguage<{ botDefinition: BotAst }>({
    botDefinition: () =>
        P.sepBy(run(exprBL())(initialState).map(result), P.optWhitespace)
            .skip(P.end)
            .map(seq)
})


// ===================== functions ========================

function bracketDepthModifier(i: number): (st: St) => St {
    return (st) => ({...st, bracketDepth: st.bracketDepth + i})
}

function prefixOptSpacesB<T>(parser: BotParser<T>): BotParser<T> {
    return thenB(spacesParser('optional', whiteSpaceType), parser)
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
            (i) => mapB(
                recursiveTailParser(),
                tail => indexed[i].combiner(head, tail)
            )
        )
    }

    function recursiveRightAssociativeParser(): BotParser<A[]> {
        const list = chainB(elt, head =>
            optionalOrElse(
                parseSepAndTailAndCombineWith(head, recursiveRightAssociativeParser),
                [head]
            )
        )

        return optionalOrElse(list, [])
    }

    return recursiveRightAssociativeParser()
}

