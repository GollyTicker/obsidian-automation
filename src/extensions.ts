import * as P from "parsimmon";

export function toPromise<T>(result: P.Result<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        if (result.status === true) {
            resolve(result.value);
        } else if (result.status === false) {
            reject("Expected: " + result.expected + ", at " + require("util").inspect(result.index));
        }
    })
}