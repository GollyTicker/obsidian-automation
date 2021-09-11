import * as P from "parsimmon";
import {TFile} from "obsidian";
import MyPlugin from "./main";
import {flatMap} from "./array-extensions";
import {START_AUTOMATION_CODE_PREFIX} from "./constants";
import {extractAutomationCodeFragments} from "./code-fragment-extraction";

export function findAndInitiateBotsSequentially(plugin: MyPlugin) {
    try {
        testAutomation(plugin)
    } catch (e) {
        console.error(e);
    }
}

export async function testAutomation(plugin: MyPlugin) {

    const vault = plugin.app.vault
    const files: TFile[] = vault.getMarkdownFiles()

    console.log("Found:", files.length, " markdown files.");

    const readFiles = files
        .map(async file => ({"fl": file, "str": await vault.read(file).catch(() => "")}))

    // use this instead: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/allSettled
    const filesWithBots = Promise.all(readFiles).then(ls =>
        ls.filter(({str}) => str.contains(START_AUTOMATION_CODE_PREFIX))
    )

    const withBotCode = filesWithBots.then(ls =>
        flatMap(ls, (obj =>
                    extractAutomationCodeFragments(obj.str).map(res => ({...obj, ...res}))
            )
        )
    )

    const awaited = await withBotCode

    awaited.forEach(obj =>
        console.log("Positions: " + obj.fl.name + " with " +
            obj.code
        )
    )

    parsingExampleFromGitHub();
}


export function parsingExampleFromGitHub() {
    let CLI = P.createLanguage({
        expression: function (r: any) {
            // whitespace-separated words, strings and options
            return P.alt(r.word, r.string, r.option)
                .sepBy(P.whitespace)
                .trim(P.optWhitespace);
        },

        option: function (r: any) {
            // one of possible quotes, then sequence of anything except that quote (unless escaped), then the same quote
            return P.seq(
                P.alt(P.string("-").then(P.regex(/[a-z]/)), P.string("--").then(r.word)),
                P.alt(P.string("=").then(r.word), P.of(true))
            );
        },

        word: function () {
            // 1 char of anything except forbidden symbols and dash, then 0+ chars of anything except forbidden symbols
            return P.regex(/[^-=\s"'][^=\s"']*/);
        },

        string: function () {
            // one of possible quotes, then sequence of anything except that quote (unless escaped), then the same quote
            return P.oneOf(`"'`).chain(function (q) {
                return P.alt(
                    P.noneOf(`\\${q}`)
                        .atLeast(1)
                        .tie(), // everything but quote and escape sign
                    P.string(`\\`).then(P.any) // escape sequence like \"
                )
                    .many()
                    .tie()
                    .skip(P.string(q));
            });
        }
    });

    function prettyPrint(x: any) {
        // @ts-ignore
        let opts = {depth: null, colors: "auto"};
        let s = require('util').inspect(x, opts);
        console.log(s);
    }

    let ast = CLI.expression.tryParse("--some --thing=x");
    prettyPrint(ast);
}