import {TFile} from "obsidian";

export interface ReadFile {
    fl: TFile
    str: string
}

export interface BotDefinition extends ReadFile {
    start: number
    end: number
    code: string
}