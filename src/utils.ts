// typesafe property distinguishing: https://fettblog.eu/typescript-hasownproperty/
export function hasOwnProperty<X extends {}, Y extends PropertyKey>
(obj: X, prop: Y): obj is X & Record<Y, unknown> {
    return obj.hasOwnProperty(prop)
}

// infix function application: $$(1, plus, 3) = plus(1,3)
export function $$<A1, A2, R>(a1: A1, func: (a1: A1, a2: A2) => R, a2: A2): R {
    return func(a1, a2)
}

// // chained infix function application: $$$(1, plus, 3, minus 5) = minus(plus(1,3),5)
// export function $$$<A1, A2, AR, B, R>(
//     a1: A1,
//     aF: (a1: A1, a2: A2) => AR,
//     a2: A2,
//     bF: ((ar: AR, b: B) => R),
//     b: B
// ): R {
//     return bF(aF(a1, a2), b)
// }