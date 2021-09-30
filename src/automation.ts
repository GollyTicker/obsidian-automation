import {App} from "obsidian";
import MyPlugin from "./main";
import {extractAutomationCodeFragments, START_AUTOMATION_CODE_PREFIX} from "./code-fragment-extraction";
import {BotDefinition, ReadFile} from "./entities";
import {asIndentedString} from "./language/transformation/foldings";
import {debugConfig} from "./debug";
import {parseBotCode} from "./language/parsing/bot-lang-parser";

// @ts-ignore - Global var defs
window.__obsidianAutomation = {
    astNodeToString: asIndentedString
};

export async function findAndInitiateBotsSequentially(plugin: MyPlugin) {
    try {
        await testAutomation(plugin)
    } catch (e) {
        console.error(e);
    }
}

export function getAllMarkdownFiles(app: App) {
    const files = app.vault.getMarkdownFiles()
    console.log("Found:", files.length, " markdown files.");
    return files
}

export async function testAutomation(plugin: MyPlugin) {

    const app = plugin.app

    const botDefinitions = await extractBotDefinitions(app)

    const parsedExpressions = botDefinitions.map(botDef =>
        parseBotCode(botDef.code).then(ast => ({...botDef, ast: ast}))
    )

    parsedExpressions.forEach(pro => pro
        .then(bot => console.log("Parsed OK - " + bot.fl.name + "\n" + asIndentedString(bot.ast, true)))
        .catch(err => console.log("Parsed FAIL: ", err))
    )
}

async function extractBotDefinitions(app: App): Promise<BotDefinition[]> {
    const files = getAllMarkdownFiles(app)

    const readFiles = files
        .filter(file => debugConfig.onlyRunDebugFiles ? file.name.contains("debug") : true)
        .map(async file => ({"fl": file, "str": await app.vault.read(file)}))

    function readFileContainsBot(settled: PromiseSettledResult<ReadFile>): ReadFile[] {
        if (settled.status != "fulfilled") {
            return [];
        } else if (settled.value.str.contains(START_AUTOMATION_CODE_PREFIX)) {
            return [settled.value];
        } else {
            return [];
        }
    }

    // use this instead: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/allSettled
    const filesWithBots = await Promise.allSettled(readFiles).then(ls => ls.flatMap(readFileContainsBot))

    return filesWithBots.flatMap(obj =>
        extractAutomationCodeFragments(obj.str).map(res => ({...obj, ...res}))
    )
}


