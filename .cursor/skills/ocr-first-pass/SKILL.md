---
name: ocr-first-pass
description: Propose Playwright OCR field crops from blank and filled screenshots. Use when the user asks for an AI first-pass, auto-detect fields, a field-proposal prompt, or to set up a screen from images instead of drawing boxes.
---

# OCR first-pass

1. Run `node tools/detect-boxes.mjs tests/screens/<screen>` so `boxes.json` and `boxes-annotated.png` exist.
2. Read `playwright-ocr/tools/ai-first-pass-prompt.md` and follow it.
3. Load blank, filled, the annotated image, and `boxes.json`. Confirm blank and filled are the same size.
4. Assign `boxIds` only. Do not invent x/y.
5. Write `tests/screens/<screen>/first-pass.json`.
6. If asked to apply, crop from the blank using `expandLeftForLabel` + `insetRect` from `tools/detect-boxes.mjs` and replace `manager.json` / `config.ts` / `templates/`.
