// debugging function. Usage: my-parser.mark().chain(debugLog("my-parser")).then(...)
import {debugConfig} from "../debug";
import * as P from "parsimmon";
import {Mark, Parser} from "parsimmon";

function debugLog<T>(str: string): (m: Mark<T>) => Parser<T> {
    return (m: Mark<T>) => {
        console.log(`${str} ${m.start.offset} ${m.end.offset - 1} ${m.value}`);
        return P.succeed(m.value)
    };
}

// debugging function. Usage: recordAttempt("my-parser", my-parser).then(...)
// @ts-ignore
function recordAttempt<T>(str: string, p: Parser<T>): Parser<T> {
    return P.succeed('').mark().chain(debugLog("Attempt: " + str)).then(p)
}

// debugging function. Usage: recordSuccess("my-parser", my-parser).then(...)
// @ts-ignore
function recordSuccess<T>(str: string, p: Parser<T>): Parser<T> {
    return p.mark().chain(debugLog("Success: " + str))
}

// debugging function.
export function addLanguageDebugging<T>(rules: T): T {
    const optAttemptLogging = {...rules}
    const optAttemptDebugLogging = {...optAttemptLogging}

    if (debugConfig.parser.logAttempts) {
        for (const [eltName, func] of Object.entries(rules)) {
            // @ts-ignore
            optAttemptLogging[eltName] = (r: any) => recordAttempt(eltName, func(r))
        }
    }

    if (debugConfig.parser.logSuccesses) {
        for (const [eltName, func] of Object.entries(optAttemptLogging)) {
            // @ts-ignore
            optAttemptDebugLogging[eltName] = (r: any) => recordSuccess(eltName, func(r))
        }
    }

    return optAttemptDebugLogging
}