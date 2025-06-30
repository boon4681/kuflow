function xfnv1a(str: string) {
    let h = 2166136261 >>> 0;

    for (let i = 0; i < str.length; i++) {
        h = Math.imul(h ^ str.charCodeAt(i), 16777619);
    }

    return (): number => {
        h += h << 13;
        h ^= h >>> 7;
        h += h << 3;
        h ^= h >>> 17;

        return (h += h << 5) >>> 0;
    };
}

function mulberry32(s: string) {
    let seed = xfnv1a(s)()

    return () => {
        let t = (seed += 0x6d2b79f5);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);

        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
}

// function sfc32(a: number, b: number, c: number, d: number) {
//     return function () {
//         a |= 0; b |= 0; c |= 0; d |= 0;
//         let t = (a + b | 0) + d | 0;
//         d = d + 1 | 0;
//         a = b ^ b >>> 9;
//         b = c + (c << 3) | 0;
//         c = (c << 21 | c >>> 11);
//         c = c + t | 0;
//         return (t >>> 0) / 4294967296;
//     }
// }

export const random = (seed: string) => {
    return mulberry32(seed)
}