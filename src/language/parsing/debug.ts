import {debugConfig} from "../../debug";
import * as P from "parsimmon";
import {Mark, Parser} from "parsimmon";
import {BotParser, St} from "./bot-parser";
import {BotAst, ExprBase} from "../ast";
import {asIndentedString} from "../transformation/foldings";

export function debugLog<T>(str: string): (m: Mark<[T, St]>) => Parser<[T, St]> {
    return (m: Mark<[T, St]>) => {
        const valueStr = m.value[0] instanceof ExprBase ? asIndentedString(m.value[0], true) : m.value[0]
        console.log(`${str}, (${m.start.offset}, ${m.end.offset - 1}) => ${valueStr}`);
        return P.succeed(m.value)
    };
}

// debugging function.
// @ts-ignore
function recordAttempt<T>(str: string): (p: BotParser<T>) => BotParser<T> {
    return (p) => (st: St) => P.succeed<["", St]>(['', st]).mark().chain(
        debugLog("Attempt: " + str?.toString() + ", d: " + st.expressionDepth)
    ).then(p(st))
}

// debugging function.
// @ts-ignore
function recordSuccess<T>(str: string): (p: BotParser<T>) => BotParser<T> {
    return (p) => (st: St) => p(st).mark().chain(
        debugLog("Success: " + str?.toString() + ", d: " + st.expressionDepth)
    )
}

// debugging function.
export function withLogs<T>(eltName: string): ((parser: BotParser<T>) => BotParser<T>) {
    return (parser) => {
        const optAttemptLogging = debugConfig.parser.logAttempts ? recordAttempt<T>(eltName)(parser) : parser
        return debugConfig.parser.logSuccesses ? recordSuccess<T>(eltName)(optAttemptLogging) : optAttemptLogging
    }
}

export async function simpleResultOutput(p: Promise<BotAst>, output: (s: string) => void = console.log) {
    await p.then(ast => output("Parsed OK: \n" + asIndentedString(ast, true)))
        .catch(err => output("Parsed FAIL: " + err))
}