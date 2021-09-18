// Since I didn't know how to properly setup jest, jasmine, karma, etc. for testing, I ended up using manual testing
// This is a minimal test framework for that purpose.

// Tests can be run, by adding a constant in the test file and
// importing it in the main.ts in the runTests function.
// Finally, one can run "Run Tests" in the command palette to run all tests.

let collectedTests: (() => void)[] = []
let successfulTests = 0

export function assert(bool: boolean, left: any, right: any): void {
    if (!bool) {
        console.log("Failure: " + left + ", " + right)
        console.assert(bool, "Failure:", left, right)
    }
}

export function test(desc: string, fn: () => void): void {
    const testRunner = () => {
        try {
            fn()
            successfulTests++
        } catch (e) {
            console.error("Encountered error in test case: ", desc)
            console.error(e)
        }
    }
    collectedTests.push(testRunner)
}

export function runAll() {
    collectedTests.forEach((f) => f())
    if (collectedTests.length == successfulTests) {
        console.log(`✅✅✅ All ${successfulTests} tests passed ✅✅✅`)
    } else {
        console.log(`❌❌❌ ${collectedTests.length - successfulTests} tests failed! ❌❌❌`)
    }
}