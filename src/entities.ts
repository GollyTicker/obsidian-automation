import {TFile} from "obsidian";
import {BotAst} from "./language/ast";

export interface ReadFile {
    fl: TFile
    str: string
}

export interface BotDefinition extends ReadFile {
    start: number
    end: number
    code: string
}

export interface InMemBot extends BotDefinition {
    ast: BotAst
}