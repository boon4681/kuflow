import { random } from "./hash"


export const ColorList = [
    'kuflow-grid',
    'kuflow-background',
    'kuflow-foreground'
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

export function hexToHSL(hex: string): { h: number; s: number; l: number } {
    hex = hex.replace(/^#/, '');
    if (hex.length === 3) {
        hex = hex.split('').map(c => c + c).join('');
    }

    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;

    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r:
                h = ((g - b) / d + (g < b ? 6 : 0));
                break;
            case g:
                h = ((b - r) / d + 2);
                break;
            case b:
                h = ((r - g) / d + 4);
                break;
        }
        h /= 6;
    }

    return {
        h: Math.round(h * 360),
        s: Math.round(s * 100),
        l: Math.round(l * 100)
    };
}
