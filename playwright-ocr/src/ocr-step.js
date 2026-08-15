import { test } from '@playwright/test';

export async function ocrStep(title, body) {
    try {
        test.info();
    }
    catch {
        return body();
    }
    return test.step(title, body, { box: true });
}

export async function attachOcrImage(name, buffer) {
    try {
        await test.info().attach(name, { body: buffer, contentType: 'image/png' });
    }
    catch {
        // Not running inside a Playwright test.
    }
}
