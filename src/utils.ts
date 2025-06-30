import { random } from "./hash"


export const ColorList = [
    'grid',
    'background',
    'foreground'
] as const

export const color = (name: typeof ColorList[number]) => {
    return `hsl(var(--${name}))`
}

export const transformStyle = ({ x, y, k }: { x: number, y: number, k?: number }) => {
    if (!k) {
        return `translateX(${x}px) translateY(${y}px)`
    }
    return `translateX(${x}px) translateY(${y}px) scale(${k})`
}

export const transform = ({ x, y, k }: { x: number, y: number, k?: number }) => {
    if (!k) {
        return `translate(${x},${y})`
    }
    return `translate(${x},${y}) scale(${k})`
}

export const colorWheel = (seed: string, hsl: "none" | "hsl" = "none") => {
    const r = random(seed)()
    if (hsl == "none") {
        return `${Math.abs(r * 360) % 360} 83.9% 67.6%`
    }
    return `hsl(${Math.abs(r * 360) % 360} 83.9% 67.6%)`
}