import {InMemBot} from "../../entities";

export function evaluateBotCode(bot: InMemBot): Promise<void> {
    console.log(`Evaluating bot: ${bot.fl.basename} -> ${bot.code.substr(0, 10)}...`)

    // todo. continue here.

    return Promise.resolve()
}