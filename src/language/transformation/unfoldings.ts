import {Random} from "../../common/random";
import {Expr, ExprToken} from "../ast";
import {unfold} from "./base-definitions";
import {regExpEscape} from "../../common/util";
import {SPECIAL_CHARS_AST} from "../parsing/constants";
import {toEscaped} from "../parsing/string";

const SPECIAL_CHAR_REG_EXP = new RegExp("[" + regExpEscape(SPECIAL_CHARS_AST) + "]", "g")

const MAX_ATOM_LENGTH = 5
const MAX_STRING_LENGTH = 5
const MAX_DATA_STRING_LENGTH = 5
const MAX_APP_TAIL_LENGTH = 3
const MAX_DEPTH = 3

export type Weights = { [t in ExprToken]: number }

const orderedExprTokens: ExprToken[] = ['Atom', 'Str', 'Data', 'App']

export function fromRandom(
    source: Random,
    weights: Weights = {
        "Atom": 2,
        "Str": 3,
        "Data": 2,
        "App": 8
    }): Expr {

    type St = { src: Random, depth: number }

    function genAtom(src: Random): { a: string } {
        return {
            a: src.string(src.intBetween(1, MAX_ATOM_LENGTH))
                .replaceAll(SPECIAL_CHAR_REG_EXP, "_")
        }
    }

    function genApp({src, depth}: St): { h: St, t: St[] } {
        const seeds = src.split(src.intBetween(1, 1 + MAX_APP_TAIL_LENGTH))
        return {
            h: {src: <Random>seeds.pop(), depth: depth + 1},
            t: seeds.map(x => ({src: x, depth: depth + 1}))
        }
    }

    function genData(src: Random): { d: any } {
        return {d: src.string(src.range(MAX_DATA_STRING_LENGTH))}
    }

    function genStr(src: Random): { s: string } {
        return {s: toEscaped(src.string(src.range(MAX_STRING_LENGTH)))}
    }

    const cumWeights = computeCumulateSumsSampling(weights)
    const cumsum = cumWeights.App

    return unfold<St>(({src, depth}: St) => {
            const i = src.intBetween(1, cumsum)
            if (depth >= MAX_DEPTH || i <= cumWeights.Atom) {
                return genAtom(src)
            } else if (i <= cumWeights.Str) {
                return genStr(src)
            } else if (i <= cumWeights.Data) {
                return genData(src)
            } else {
                return genApp({src, depth})
            }
        },
        {src: source, depth: 0}
    )
}

function computeCumulateSumsSampling(weights: Weights): { [t in ExprToken]: number } {
    const cumWeights = <{ [t in ExprToken]: number }>{}
    let cumsum = 0

    for (const ty of orderedExprTokens) {
        cumsum = cumsum + weights[ty]
        cumWeights[ty] = cumsum
    }

    console.assert(
        cumsum === cumWeights.App,
        "Cum. sum must be maximal on App.",
        weights, cumWeights
    )
    return cumWeights
}