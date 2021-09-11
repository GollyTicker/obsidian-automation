export function flatMap<A, B>(xs: A[], fn: (x: A) => B[]): B[] {
    const result: B[] = [];
    xs.forEach((elt: A) => result.push(...fn(elt)))
    return result;
}