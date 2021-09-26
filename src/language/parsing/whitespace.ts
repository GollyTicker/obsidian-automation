import * as P from "parsimmon";
import {Parser} from "parsimmon";
import {BotParser, St, withSt} from "./bot-parser";

export type WhiteSpaceType = 'simple' | 'w/newline'

export type MandatoryFlag = 'mandatory' | 'optional'

const mandatorySimpleWhitespace = P.regexp(/[ \t]+/)

const optSimpleWhitespace = P.regexp(/[ \t]*/)

const spaceParsersMap: { [k in WhiteSpaceType]: { [f in MandatoryFlag]: Parser<string> } } = {
    'simple': {
        'mandatory': mandatorySimpleWhitespace,
        'optional': optSimpleWhitespace
    },
    'w/newline': {
        'mandatory': P.whitespace,
        'optional': P.optWhitespace
    }
}

export const spacesParser: ((flag: MandatoryFlag, decider: (st: St) => WhiteSpaceType) => BotParser<string>) =
    (flag, decider) => (st: St) => {
        return spaceParsersMap[decider(st)][flag].map(withSt(st))
    }