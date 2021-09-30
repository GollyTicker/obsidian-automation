import * as P from "parsimmon";

export function toPromise<T>(result: P.Result<T>, code: string): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        if (result.status) {
            resolve(result.value);
        } else {
            reject("Expected: " + result.expected + ", at " + P.formatError(code, result));
        }
    })
}

// Stackoverflow: https://stackoverflow.com/a/30851002
export function regExpEscape(str: string): string {
    return str.replace(/[-[\]{}()*+!<=:?.\/\\^$|#\s,]/g, '\\$&');
}