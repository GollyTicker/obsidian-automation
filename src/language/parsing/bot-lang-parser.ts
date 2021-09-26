import {BotDefinition} from "../../entities";
import * as P from "parsimmon";
import {app, Atom, atom, BotAst, Expr, seq} from "../ast";
import {spaceParser} from "./whitespace";
import {regExpEscape, toPromise} from "../../common/util";
import {BRACKET_CLOSE, BRACKET_OPEN, COLON, COMMA, SPECIAL_CHARS} from "./constants";
import {
    altB,
    BotParser,
    chainB,
    lazyChainB,
    mapB,
    mapStB,
    regexp,
    result,
    run,
    St,
    succeed,
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
*   To achieve that, preOptSpaceB(parser) can be called
* * Each PARSER is stateful and is of type BotParser<T> = (state:St) => Parser<[T,St]>.
*   The state is used to parameterize the parsing. Each parser hands over a (possibly different) state to
*   its descendents and children.
* */

// todo. could use typescript decorations

// ================ basic definitions ====================

const comma = preOptSpaceB(regexp(new RegExp(regExpEscape(COMMA))))

const colon = preOptSpaceB(regexp(new RegExp(regExpEscape(COLON))))

const bracketOpen = preOptSpaceB(
    mapStB(
        regexp(new RegExp(regExpEscape(BRACKET_OPEN))),
        bracketDepthModifier(1)
    )
)

const bracketClose = preOptSpaceB(
    mapStB(
        regexp(new RegExp(regExpEscape(BRACKET_CLOSE))),
        bracketDepthModifier(-1)
    )
)

const argListSeparator = altB(comma, spaceParser('mandatory'))


// ======================= main definitions =======================

const ATOM_BREAKER_REG_EXP_PART = regExpEscape(SPECIAL_CHARS) + "\\s"

const ATOM = new RegExp("[^" + ATOM_BREAKER_REG_EXP_PART + "]+")

function atomBL(): BotParser<Atom> {
    return withLogs<Atom>("atom")(preOptSpaceB(mapB(regexp(ATOM), atom)))
}

// ( (exprBL) | atomBL | "str" | %exprBL ) (: argListBL)?
function exprBL(): BotParser<Expr> {

    function head(): BotParser<Expr> {
        return altB<Expr>(
            atomBL(),
            surroundB(bracketOpen, exprBL(), bracketClose)
        )
    }

    const optColonPrefixedArgList = (hd: Expr) => {
        const colonArgList = thenB(colon,
            mapB(argListBL(), tl => app(hd, tl))
        )

        let fallBackEmptyList = succeed(hd)

        return altB<Expr>(colonArgList, fallBackEmptyList)
    }

    return withLogs<Expr>("expr")(preOptSpaceB(lazyChainB(head, optColonPrefixedArgList)))
}

function argListBL(): BotParser<Expr[]> {
    return withLogs<Expr[]>("argList")(
        seqByRightAssocB(
            exprBL(),
            [
                {sep: colon, combiner: (x: Expr, xs: Expr[]) => [app(x, xs)]},
                {sep: argListSeparator, combiner: (x: Expr, xs: Expr[]) => [x].concat(xs)}
            ]
        )
    )
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

function preOptSpaceB<T>(parser: BotParser<T>): BotParser<T> {
    return thenB(spaceParser('optional'), parser)
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

    const fallbackEmptyList = succeed([])

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
        return altB(
            chainB(elt, head =>
                altB(
                    parseSepAndTailAndCombineWith(head, recursiveRightAssociativeParser),
                    succeed([head])
                )
            ),
            fallbackEmptyList
        )
    }

    return recursiveRightAssociativeParser()
}

