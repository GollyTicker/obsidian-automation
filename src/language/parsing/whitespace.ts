import * as P from "parsimmon";
import {Parser} from "parsimmon";
import {BotParser, St, WhiteSpace, withSt} from "./bot-parser";

// We only want to use non newline whitespace
const mandatorySimpleWhitespace = P.regexp(/[ \t]+/)
const optSimpleWhitespace = P.regexp(/[ \t]*/)

type MandatoryFlag = 'mandatory' | 'optional'
const spaceParsersMap: { [k in WhiteSpace]: { [f in MandatoryFlag]: Parser<string> } } = {
    'simple': {
        'mandatory': mandatorySimpleWhitespace,
        'optional': optSimpleWhitespace
    },
    'w/newline': {
        'mandatory': P.whitespace,
        'optional': P.optWhitespace
    }
}

function whiteSpaceType(st: St): WhiteSpace {
    return st.bracketDepth >= 1 ? 'w/newline' : 'simple'
}

export const spaceParser: ((flag: MandatoryFlag) => BotParser<string>) = (flag) => (st: St) => {
    return spaceParsersMap[whiteSpaceType(st)][flag].map(withSt(st))
}