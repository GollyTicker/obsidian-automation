import {Random} from "../../common/random";
import {Expr} from "../ast";
import {unfold} from "./base";
import {regExpEscape} from "../../common/util";
import {SPECIAL_CHARS} from "../constants";

const SPECIAL_CHAR_REG_EXP = new RegExp("[" + regExpEscape(SPECIAL_CHARS) + "]");
const MAX_ATOM_LENGTH = 5
const MAX_APP_TAIL_LENGTH = 3
const MAX_DEPTH = 3

export function fromRandom(source: Random): Expr {
    type St = { src: Random, depth: number }

    function genAtom(src: Random): string {
        return src
            .string(src.intBetween(1, MAX_ATOM_LENGTH))
            .replace(SPECIAL_CHAR_REG_EXP, "_")
    }

    function genApp({src, depth}: St): { h: St, t: St[] } {
        const seeds = src.split(src.intBetween(1, 1 + MAX_APP_TAIL_LENGTH))
        return {
            h: {src: <Random>seeds.pop(), depth: depth + 1},
            t: seeds.map(x => ({src: x, depth: depth + 1}))
        }
    }

    return unfold<St>(({src, depth}: St) => {
            if (depth >= MAX_DEPTH || src.boolean()) {
                return genAtom(src)
            } else {
                return genApp({src, depth})
            }
        },
        {src: source, depth: 0}
    )
}