// typesafe property distinguishing: https://fettblog.eu/typescript-hasownproperty/
export function hasOwnProperty<X extends {}, Y extends PropertyKey>
(obj: X, prop: Y): obj is X & Record<Y, unknown> {
    return obj.hasOwnProperty(prop)
}

// infix function application: __(1, plus, 3) = plus(1,3)
export function __<A1, A2, R>(a1: A1, func: (a1: A1, a2: A2) => R, a2: A2): R {
    return func(a1, a2)
}