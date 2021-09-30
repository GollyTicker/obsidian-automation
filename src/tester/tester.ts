// Since I didn't know how to properly setup jest, jasmine, karma, etc. for testing, I ended up using manual testing
// This is a minimal test framework for that purpose.

// Tests can be run, by adding a constant in the test file and
// importing it in the main.ts in the runTests function.
// Finally, one can run "Run Tests" in the command palette to run all tests.

import {Notice} from "obsidian";

let collectedTests: (() => Promise<void>)[] = []
let successfulTests = 0

export function assert(bool: boolean, left: any, right: any): void {
    if (!bool) {
        console.log("Failure: " + left + " || " + right)
        console.assert(bool, "Failure.")
        throw new Error()
    }
}

export function test(desc: string, fn: () => Promise<void>): void {
    const testRunner = async () => {
        try {
            await fn()
            successfulTests++
        } catch (e) {
            console.error("Encountered error in test case: ", desc)
            console.error(e)
        }
    }
    collectedTests.push(testRunner)
}

export async function runAll() {
    new Notice("Running all tests", 3000);

    for (const testCase of collectedTests) {
        await testCase()
    }

    if (collectedTests.length == successfulTests) {
        const msg = `✅✅✅ All ${successfulTests} tests passed ✅✅✅`
        console.log(msg)
        new Notice(msg, 5000)
    } else {
        const msg = `❌❌❌ ${collectedTests.length - successfulTests} of ${collectedTests.length} tests failed! ❌❌❌`
        console.log(msg)
        new Notice(msg, 5000)
    }
}