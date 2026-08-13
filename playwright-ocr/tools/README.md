# Template Manager Tool

Visual tool for creating UI element templates. **Export writes the files** — no copy/paste.

By default everything lands in `tests/screens/<screen-name>/`. You can point `config.ts` and the PNG images at the same folder or at different folders.

## Quick Start

```bash
npm run template-manager
```

Opens http://localhost:8000.

1. Load a blank screenshot.
2. Draw boxes, name elements, save templates.
3. Enter a screen name (`random-test` is fine).
4. Click **Export Screen**.

That creates:

```
tests/screens/random-test/
  config.ts
  blank.png
  templates/
    first-name-input.png
    ...
```

## Destinations

Set these in the sidebar before exporting.

| Setting | Default | Other option |
|---|---|---|
| **config.ts** | In repo (`tests/screens`) | Custom folder |
| **Images** | Same as config | Different folder |

Common setups:

- **Normal:** both in repo. Click Export.
- **Repo can’t hold PNGs:** config.ts in repo, images in a custom folder (`~/ocr-screens`, a USB drive, etc.).
- **Everything off-repo:** custom folder for config and “same as config” for images.

When images live somewhere else, the generated `config.ts` uses `screenAssetsDir()` so tests still find them via `OCR_SCREENS_DIR` or `~/.playwright-ocr-screens.json`.

```bash
export OCR_SCREENS_DIR="$HOME/ocr-screens"
```

## Naming

| What you type | What gets saved |
|---|---|
| Element `first-name-input` | `firstNameInput` |
| Screen `random-test` | Folder `random-test/` |
| Screen `random-test` | Export `randomTestScreen` |

Template PNGs are kebab-case: `firstNameInput` → `first-name-input.png`.

## Other export options

- **Download ZIP** — portable copy of the screen folder. Prefer **Export Screen** so files go to the configured destinations.
- **Preview Config** — shows what would be written; does not create files.

## Using the exported screen

```typescript
import { randomTestScreen } from './screens/random-test/config.js';

const screenshot = await formTester.captureScreen('random-test.png');
const results = await formTester.compareScreen(screenshot, randomTestScreen);
```

## Troubleshooting

**Export is disabled**

Run `npm run template-manager` and use http://localhost:8000 — not a `file://` tab.

**Tests cannot find blank.png**

If images are in a custom folder, confirm `<images-dir>/<screen>/blank.png` exists, or set `OCR_SCREENS_DIR` to that parent folder.
