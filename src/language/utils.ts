import * as P from "parsimmon";
import {Parser} from "parsimmon";

export function optionalList<T>(parser: Parser<T[]>): Parser<T[]> {
    return parser.or(P.succeed([]))
}

export function optional<T>(parser: Parser<T>): Parser<T | ''> {
    return parser.or(P.succeed(''))
}

// We only want to use non newline whitespace
export const optSimpleWhitespace = P.regexp(/[ \t]*/)

