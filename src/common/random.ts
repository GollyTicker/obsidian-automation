import {create, RandomSeed} from "random-seed";

export type Random = RandomSeed & RandomSeedExtensions

export const random = (seed: string): Random => extendRandomSeed(create(seed))

interface RandomSeedExtensions {
    boolean(): boolean

    choose<T>(xs: T[]): T

    split(n: number): Random[]
}

function extendRandomSeed(rand: RandomSeed): Random {
    rand.prototype.boolean = () => {
        return rand.intBetween(0, 1) == 0;
    }

    rand.prototype.choose = function <T>(xs: T[]): T {
        return xs[rand.range(xs.length)];
    }

    const SPLIT_STRING_SEED_SIZE = 50;
    rand.prototype.split = function (n: number): Random[] {
        const arr = new Array<Random>(n);
        // for some reason using map here didn't work...
        for (let i = 0; i < arr.length; i++) {
            const seed = rand.string(SPLIT_STRING_SEED_SIZE)
            arr[i] = random(i + seed)
        }
        return arr
    }

    return {...rand, ...rand.prototype};
}