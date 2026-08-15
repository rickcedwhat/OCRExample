import { createWorker } from 'tesseract.js';

const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWER = UPPER.toLowerCase();
const DIGITS = '0123456789';

export const CHARSET_PRESETS = {
    text: `${UPPER}${LOWER}${DIGITS} ./ -`,
    digits: `${DIGITS} / `,
    alnum: `${UPPER}${LOWER}${DIGITS}`,
    email: `${UPPER}${LOWER}${DIGITS}@._-`,
    vin: `${UPPER}${LOWER}${DIGITS}`,
};

export function charsetForField(name = '', type = '', preset = 'auto') {
    if (type === 'checkbox')
        return undefined;
    if (preset && preset !== 'auto' && CHARSET_PRESETS[preset])
        return CHARSET_PRESETS[preset];
    const key = `${name} ${type}`.toLowerCase();
    if (key.includes('email'))
        return CHARSET_PRESETS.email;
    if (key.includes('vin'))
        return CHARSET_PRESETS.vin;
    if (key.includes('contact') && key.includes('method'))
        return CHARSET_PRESETS.text;
    if (key.includes('phone') || key.includes('odometer') || key.includes('year') || key.includes('zip'))
        return CHARSET_PRESETS.digits;
    return CHARSET_PRESETS.text;
}

export function normalizeOcrText(text) {
    return String(text ?? '').replace(/\n+/g, ' ').trim();
}

export function pickFromOptions(text, options) {
    if (!text || !options?.length)
        return text;
    const compact = (value) => value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const tokens = (value) => value.toUpperCase().match(/[A-Z0-9]+/g) || [];
    const got = compact(text);
    const gotTokens = tokens(text);
    let best = null;
    let bestScore = 0;
    for (const option of options) {
        const want = compact(option);
        if (!want)
            continue;
        if (got === want)
            return option;
        let score = 0;
        const shorter = got.length < want.length ? got : want;
        const longer = got.length < want.length ? want : got;
        if (longer.includes(shorter))
            score = shorter.length / longer.length;
        const wantTokens = tokens(option);
        if (gotTokens.length && gotTokens.length === wantTokens.length) {
            const prefixes = gotTokens.every((token, i) => wantTokens[i].startsWith(token) || token.startsWith(wantTokens[i]));
            if (prefixes)
                score = Math.max(score, 0.55);
        }
        const initials = wantTokens.map((token) => token[0] ?? '').join('');
        if (initials && (got === initials || gotTokens.join('') === initials))
            score = Math.max(score, 0.6);
        if (score > bestScore) {
            best = option;
            bestScore = score;
        }
    }
    return bestScore >= 0.4 ? best : text;
}

function allowedActuals(expectedChar, swaps) {
    const allowed = new Set([expectedChar]);
    const extra = swaps?.[expectedChar];
    if (extra == null)
        return allowed;
    const values = typeof extra === 'string' ? [extra] : extra;
    for (const value of values) {
        for (const ch of value)
            allowed.add(ch);
    }
    return allowed;
}

function charsMatch(actual, expected, swaps) {
    const got = [...actual];
    const want = [...expected];
    if (got.length !== want.length)
        return false;
    return got.every((ch, i) => allowedActuals(want[i] ?? '', swaps).has(ch));
}

function charEq(actual, expected, swaps) {
    return allowedActuals(expected, swaps).has(actual);
}

function minKeep(wantLen) {
    return Math.min(wantLen, Math.max(3, Math.ceil(wantLen * 0.5)));
}

function containsSlice(want, slice, swaps) {
    if (slice.length > want.length)
        return false;
    for (let i = 0; i <= want.length - slice.length; i++) {
        if (slice.every((ch, j) => charEq(ch, want[i + j] ?? '', swaps)))
            return true;
    }
    return false;
}

const DEFAULT_OVERFLOW_SLOP = 2;

function overflowMatches(actual, expected, overflow, swaps, slop = DEFAULT_OVERFLOW_SLOP) {
    const got = [...actual];
    const want = [...expected];
    if (!want.length)
        return !got.length;
    const keep = minKeep(want.length);
    if (overflow === 'end') {
        let matched = 0;
        while (matched < got.length && matched < want.length && charEq(got[matched] ?? '', want[matched] ?? '', swaps)) {
            matched++;
        }
        return matched >= keep && (got.length - matched) <= slop;
    }
    if (overflow === 'start') {
        let matched = 0;
        while (matched < got.length && matched < want.length
            && charEq(got[got.length - 1 - matched] ?? '', want[want.length - 1 - matched] ?? '', swaps)) {
            matched++;
        }
        return matched >= keep && (got.length - matched) <= slop;
    }
    for (let left = 0; left <= slop; left++) {
        for (let right = 0; right <= slop; right++) {
            if (left + right >= got.length)
                continue;
            const slice = got.slice(left, got.length - right);
            if (slice.length < keep)
                continue;
            if (containsSlice(want, slice, swaps))
                return true;
        }
    }
    return false;
}

export function ocrTextMatches(actual, expected, options = {}) {
    if (expected instanceof RegExp)
        return expected.test(actual);
    if (options.overflow) {
        return overflowMatches(actual, expected, options.overflow, options.swaps, options.overflowSlop ?? DEFAULT_OVERFLOW_SLOP);
    }
    if (options.exact)
        return charsMatch(actual, expected, options.swaps);
    if (actual.includes(expected))
        return true;
    if (!options.swaps || !Object.keys(options.swaps).length)
        return false;
    const got = [...actual];
    const want = [...expected];
    if (want.length > got.length)
        return false;
    for (let i = 0; i <= got.length - want.length; i++) {
        if (charsMatch(got.slice(i, i + want.length).join(''), expected, options.swaps))
            return true;
    }
    return false;
}

/**
 * OCR utility for extracting text from images using Tesseract.js
 */
export class OCRUtil {
    worker = null;
    language = 'eng';
    async initialize(language = 'eng') {
        if (this.worker && this.language === language)
            return;
        await this.terminate();
        this.language = language;
        this.worker = await createWorker(language);
    }
    ocrParams(options = {}) {
        return {
            tessedit_pageseg_mode: options.psm ?? '7',
            tessedit_char_whitelist: options.charset
                || 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@._- /',
            user_defined_dpi: '300',
            preserve_interword_spaces: '1',
        };
    }
    async ensureWorker() {
        if (!this.worker)
            await this.initialize(this.language);
        if (!this.worker)
            throw new Error('OCR worker not initialized. Call initialize() first.');
        return this.worker;
    }
    async extractText(imageBuffer, options = {}) {
        const worker = await this.ensureWorker();
        await worker.setParameters(this.ocrParams(options));
        const { data } = await worker.recognize(imageBuffer);
        return normalizeOcrText(data.text);
    }
    async extractDetailedText(imageBuffer) {
        const worker = await this.ensureWorker();
        await worker.setParameters(this.ocrParams());
        const { data } = await worker.recognize(imageBuffer);
        return {
            text: data.text.trim(),
            confidence: data.confidence,
            words: data.words?.map((word) => ({
                text: word.text,
                confidence: word.confidence,
                bbox: word.bbox,
            })) || [],
            lines: data.lines?.map((line) => ({
                text: line.text,
                confidence: line.confidence,
                bbox: line.bbox,
            })) || [],
        };
    }
    async terminate() {
        if (this.worker) {
            await this.worker.terminate();
            this.worker = null;
        }
    }
}
let sharedOCRUtil = null;
export async function getOCRUtil(language = 'eng') {
    if (!sharedOCRUtil) {
        sharedOCRUtil = new OCRUtil();
        await sharedOCRUtil.initialize(language);
    }
    return sharedOCRUtil;
}
export async function cleanupOCR() {
    if (sharedOCRUtil) {
        await sharedOCRUtil.terminate();
        sharedOCRUtil = null;
    }
}
