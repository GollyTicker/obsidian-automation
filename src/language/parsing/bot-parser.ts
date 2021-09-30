import * as P from "parsimmon";
import {Parser} from "parsimmon";
import {__} from "../../utils";

/* ================= !! IMPORTANT !! ======================
The types in @types/parsimmon are older than the actual parser used!
Check against the API at https://github.com/jneen/parsimmon/blob/master/API.md
to be sure.
*/

export type St = {
    bracketDepth: number

    expressionDepth: number

    /**
     * A list of numbers indicating the depths of expression nesting in which interpolations are active.
     *
     * For instance, when writing (a: %b: c) %"%f", we want that the interpolation in the
     * first half of the expression works - but that it doesn't extend until the second half of the expression.
     * The final %f should be interpreted as a variable to be substituted.
     */
    interpolationRegimes: number[]
}

export type BotParser<T> = (state: St) => Parser<[T, St]>


// =========== create BotParsers =============

/**
 * todo.
 */
export function fromSimple<T>(parser: Parser<T>): BotParser<T> {
    return (st) => parser.map(withSt(st))
}

/**
 * todo.
 */
export function succeed<T>(t: T): BotParser<T> {
    return fromSimple(P.succeed(t))
}

/**
 * todo.
 */
export function regexp(r: RegExp): BotParser<string> {
    return fromSimple(P.regexp(r))
}


// =========== work with the result or the state =============

/**
 * todo.
 */
export function runWith<T>(p: BotParser<T>, st: St): Parser<[T, St]> {
    return p(st)
}


/**
 * todo.
 */
export function result<T>(parsed: [T, St]): T {
    return parsed[0]
}

/**
 * todo.
 */
function getSt<T>(parsed: [T, St]): St {
    return parsed[1]
}

/**
 * todo.
 */
export function withSt<T>(st: St): ((t: T) => [T, St]) {
    return (t) => [t, st]
}

/**
 * todo.
 */
export function withResult<T>(t: T): ((tpl: [any, St]) => [T, St]) {
    return (tpl) => [t, getSt(tpl)]
}


// =========== BotParser combinators - hence B suffix =============

/**
 * todo.
 */
export function surroundB<T>(before: BotParser<string>, elt: BotParser<T>, after: BotParser<string>): BotParser<T> {
    return __(before, thenB, __(elt, skipB, after))
}

// hint: it's the Monad bind
/**
 * todo.
 */
export function chainB<T, R>(first: BotParser<T>, chained: (t: T) => BotParser<R>): BotParser<R> {
    return (st0) => first(st0).chain(([t, st1]) => chained(t)(st1))
}

/**
 * todo.
 */
export function lazyChainB<T, R>(first: () => BotParser<T>, chained: (t: T) => BotParser<R>): BotParser<R> {
    return (st0) => first()(st0).chain(([t, st1]) => chained(t)(st1))
}

/**
 * todo.
 */
export function mapB<T, R>(parser: BotParser<T>, func: (t: T) => R): BotParser<R> {
    return __(parser, chainB, (t: T) => succeed(func(t)))
}

/**
 * todo.
 */
export function withResultB<T>(parser: BotParser<any>, t: T): BotParser<T> {
    return __(parser, mapB, () => t)
}

/**
 * todo.
 */
export function thenB<T>(skipped: BotParser<any>, parser: BotParser<T>): BotParser<T> {
    return __(skipped, chainB, () => parser)
}

/**
 * todo.
 */
export function skipB<T>(parser: BotParser<T>, skipped: BotParser<any>): BotParser<T> {
    return __(parser, chainB, (t: T) => withResultB(skipped, t))
}

/**
 * todo.
 */
export function altB<T>(...parsers: BotParser<T>[]): BotParser<T> {
    return (st) => P.alt<[T, St]>(...parsers.map(p => p(st)))
}

/**
 * todo.
 */
export function optionalOrElse<T>(parser: BotParser<T>, fallback: T): BotParser<T> {
    return altB(parser, succeed(fallback))
}

/**
 * todo.
 */
export function mapStB<T>(parser: BotParser<T>, func: (st: St) => St): BotParser<T> {
    return (st0: St) => parser(st0).map(([t, st1]) => [t, func(st1)])
}

/**
 * todo.
 */
export function onSt(func: (st: St) => St): BotParser<""> {
    return __(succeed<"">(""), mapStB, func)
}