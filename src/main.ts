import {App, Modal, Notice, Plugin, PluginSettingTab, Setting} from 'obsidian';

import {findAndInitiateBotsSequentially} from './automation';
import {runAll} from "./tester/tester";
import {add} from "./language/transformation/transformations.test";
import {add as add2} from "./language/parsing/bot-lang-parser.test";
import {add as add3} from "./language/evaluation/pattern-matching.test";
import {debugConfig} from "./debug";

interface MyPluginSettings {
    mySetting: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
    mySetting: 'default'
}

async function runTests() {
    // @ts-ignore
    add;
    // @ts-ignore
    add2;
    // @ts-ignore
    add3;
    await runAll()
}

export default class MyPlugin extends Plugin {
    settings: MyPluginSettings;

    async onload() {
        console.log('loading plugin');

        await this.loadSettings();

        this.addRibbonIcon('dice', 'Kickoff Automation', () => {
            debugConfig.onlyRunDebugFiles = false
            findAndInitiateBotsSequentially(this);
            new Notice('Who let the bots out? Woof!');
        });

        this.addRibbonIcon('???', 'Run Debug File', () => {
            debugConfig.onlyRunDebugFiles = true
            findAndInitiateBotsSequentially(this);
            new Notice('Debug debug!');
        });

        this.addStatusBarItem().setText('Status Bar Text');

        this.addCommand({
            id: 'run-tests',
            name: 'Run Tests',
            // callback: () => {
            // 	console.log('Simple Callback');
            // },
            checkCallback: (checking: boolean) => {
                let leaf = this.app.workspace.activeLeaf;
                if (leaf) {
                    if (!checking) {
                        runTests();
                        new SampleModal(this.app)/*.open();*/
                    }
                    return true;
                }
                return false;
            }
        });

        this.addSettingTab(new SampleSettingTab(this.app, this));

        this.registerCodeMirror((cm: CodeMirror.Editor) => {
            console.log('codemirror', cm);
        });

        // this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
        //     console.log('click', evt);
        // });

        this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
    }

    onunload() {
        console.log('unloading plugin');
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}

class SampleModal extends Modal {
    constructor(app: App) {
        super(app);
    }

    onOpen() {
        let {contentEl} = this;
        contentEl.setText('Woah!');
    }

    onClose() {
        let {contentEl} = this;
        contentEl.empty();
    }
}

class SampleSettingTab extends PluginSettingTab {
    plugin: MyPlugin;

    constructor(app: App, plugin: MyPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        let {containerEl} = this;

        containerEl.empty();

        containerEl.createEl('h2', {text: 'Settings for my awesome plugin.'});

        new Setting(containerEl)
            .setName('Setting #1')
            .setDesc('It\'s a super super secret!')
            .addText(text => text
                .setPlaceholder('Enter your secret')
                .setValue('')
                .onChange(async (value) => {
                    console.log('Secret: ' + value);
                    this.plugin.settings.mySetting = value;
                    await this.plugin.saveSettings();
                }));
    }
}
