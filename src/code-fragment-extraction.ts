import {END_CODEBLOCK_SEPARATOR, START_AUTOMATION_CODE_PREFIX} from "./constants";

export function extractAutomationCodeFragments(str: string): { start: number, end: number, code: string }[] {
    const results = [];
    for (let searchPosition = 0; ;) {
        let {start, end} = extractAutomationCodeFragmentStartingAt(searchPosition, str);
        if (Math.min(start, end) == -1) {
            break;
        }
        results.push({start: start, end: end, code: str.substring(afterStart(start), end)});
        searchPosition = afterEnd(end);
    }
    return results
}

function extractAutomationCodeFragmentStartingAt(searchPosition: number, str: string) {
    const start = str.indexOf(START_AUTOMATION_CODE_PREFIX, searchPosition);
    const end = str.indexOf(END_CODEBLOCK_SEPARATOR, afterStart(start));
    return {start, end};
}

const afterStart = (start: number) => start + START_AUTOMATION_CODE_PREFIX.length

const afterEnd = (end: number) => end + END_CODEBLOCK_SEPARATOR.length