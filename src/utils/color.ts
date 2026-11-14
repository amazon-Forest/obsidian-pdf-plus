import { HexString, RGB } from 'obsidian';


export function isHexString(color: string) {
    // It's actually /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i
    // but it will be overkill
    return color.length === 7 && color.startsWith('#');
}

// Thanks https://stackoverflow.com/a/5624139
export function hexToRgb(hexColor: HexString) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hexColor);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

// Thanks https://stackoverflow.com/a/5624139
export function rgbToHex(rgb: RGB) {
    const { r, g, b } = rgb;
    return '#' + (1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1);
}

export function rgbStringToObject(rgbString: string): RGB {
    const [r, g, b] = rgbString // "R, G, B"
        .split(',')
        .map((s) => parseInt(s.trim())); // [R, G, B];
    return { r, g, b };
}

/**
 * Resolve any CSS color value into sRGB components, ignoring the alpha channel.
 * The value may contain CSS variables and/or be in a modern color space
 * (e.g. `var(--highlight-background)`, `oklch(...)`, `color-mix(...)`).
 * Returns `null` if the value cannot be resolved into a color.
 */
export function resolveCssColorToRgb(cssColor: string, contextEl: HTMLElement = document.body): RGB | null {
    const probeEl = contextEl.createDiv();
    try {
        // First, let the browser convert the color into sRGB and force the alpha channel to 1 so that the result
        // can be told apart from `transparent`, which is what an invalid value computes to.
        // The second candidate is for the environments without the relative color syntax support.
        for (const value of [`rgb(from ${cssColor} r g b / 1)`, cssColor]) {
            probeEl.style.backgroundColor = '';
            probeEl.style.backgroundColor = value;
            const rgb = parseComputedColor(getComputedStyle(probeEl).backgroundColor);
            if (rgb) return rgb;
        }
        return null;
    } finally {
        probeEl.remove();
    }
}

/**
 * Parse a color serialized by `getComputedStyle`, i.e. `rgb(R, G, B)`, `rgba(R, G, B, A)` or `color(srgb R G B / A)`.
 * Fully transparent colors and the other formats are treated as unresolved (`null`).
 */
export function parseComputedColor(computedColor: string): RGB | null {
    const clamp = (value: number) => Math.min(255, Math.max(0, Math.round(value)));

    let match = computedColor.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+))?\s*\)$/);
    if (match) {
        if (match[4] !== undefined && parseFloat(match[4]) === 0) return null;
        return { r: clamp(+match[1]), g: clamp(+match[2]), b: clamp(+match[3]) };
    }

    match = computedColor.match(/^color\(srgb\s+([\d.e+-]+)\s+([\d.e+-]+)\s+([\d.e+-]+)(?:\s*\/\s*([\d.e+-]+))?\s*\)$/);
    if (match) {
        if (match[4] !== undefined && parseFloat(match[4]) === 0) return null;
        return { r: clamp(+match[1] * 255), g: clamp(+match[2] * 255), b: clamp(+match[3] * 255) };
    }

    return null;
}

/** Get the color that Obsidian uses for ==highlights== in the current theme. */
export function getObsidianDefaultHighlightColorRGB(): RGB {
    // Up to Obsidian 1.13, the color was available as an "R, G, B" triple.
    const legacyRgbString = getComputedStyle(document.body).getPropertyValue('--text-highlight-bg-rgb').trim();
    if (legacyRgbString) {
        const { r, g, b } = rgbStringToObject(legacyRgbString);
        if ([r, g, b].every((value) => Number.isFinite(value))) return { r, g, b };
    }

    // Obsidian 1.14 removed `--text-highlight-bg-rgb`. `--text-highlight-bg` is no longer defined by default either
    // (themes can still set it), and the default highlight color is now `--highlight-background`.
    return resolveCssColorToRgb('var(--text-highlight-bg, var(--highlight-background))')
        // Obsidian's highlight color before 1.14
        ?? { r: 255, g: 208, b: 0 };
}

export function getBorderRadius() {
    const cssValue = getComputedStyle(document.body).getPropertyValue('--radius-s');
    if (cssValue.endsWith('px')) {
        const px = parseInt(cssValue.slice(0, -2));
        if (!isNaN(px)) return px;
    }
    return 0;
}
