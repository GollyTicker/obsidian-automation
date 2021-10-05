import {InMemBot} from "../../entities";
import {MatchRes, patternMatch, WHEN_BECOME_PATTERN} from "./pattern-matching";


class ActiveBots {
    bots: InMemBot[] = []

    botRunner: Promise<any>[] = []

    constructor() {
    }

    private static initiateBotOnTarget(bot: InMemBot, target: InMemBot): Promise<void> {
        console.log(`Starting to evaluate bot: ${bot.fl.basename} on ${target.fl.basename}. Def: ${bot.code.substr(0, 10)}...`)

        return Promise.resolve().then(() => {
            const patternDef: MatchRes = patternMatch(WHEN_BECOME_PATTERN, bot.ast)

            console.log("Pattern: " + patternDef)

            // todo. match this pattern in the targetBot and apply it

            return Promise.resolve()
        })
    }

    public addBot(bot: InMemBot) {
        this.bots.push(bot)
        this.bots.forEach(targetBot => ActiveBots.initiateBotOnTarget(bot, targetBot))
    }

    public clear() {
        this.bots = []
    }
}

let activeBots: ActiveBots = new ActiveBots()

export function resetBots() {
    activeBots.clear()
}

export function activateBot(bot: InMemBot): void {
    activeBots.addBot(bot)
    // todo. start async function which applies all rules until they don't match anymore.
}