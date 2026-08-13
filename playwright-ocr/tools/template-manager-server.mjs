#!/usr/bin/env node
/**
 * Local Template Manager server.
 * Exports screens by writing config.ts and PNG templates to configured destinations.
 *
 *   npm run template-manager
 */
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { exec } from 'node:child_process';

const TOOLS_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(TOOLS_DIR, '..');
const REPO_SCREENS_DIR = path.join(PROJECT_ROOT, 'tests', 'screens');
const HTML_FILE = path.join(TOOLS_DIR, 'template-manager.html');
const SETTINGS_FILE = path.join(os.homedir(), '.playwright-ocr-screens.json');
const DEFAULT_EXTERNAL_DIR = path.join(os.homedir(), 'ocr-screens');
const MAX_BODY_BYTES = 50 * 1024 * 1024;
const DEFAULT_PORT = Number(process.env.PORT) || 8000;

function expandHomeDir(raw) {
  const value = String(raw ?? '').trim();
  if (value === '~') return os.homedir();
  if (value.startsWith('~/') || value.startsWith('~\\')) {
    return path.join(os.homedir(), value.slice(2));
  }
  return value;
}

function resolveDir(raw) {
  const expanded = expandHomeDir(raw);
  if (!expanded || !path.isAbsolute(expanded)) {
    throw new Error('Folder must be an absolute path (or start with ~).');
  }
  return path.resolve(expanded);
}

function defaultSettings() {
  return {
    configLocation: 'repo',
    configDir: REPO_SCREENS_DIR,
    imagesLocation: 'same',
    imagesDir: REPO_SCREENS_DIR,
  };
}

function normalizeSettings(raw = {}) {
  if (raw.storage === 'external' && !raw.configLocation) {
    const imagesDir = resolveDir(raw.screensDir || DEFAULT_EXTERNAL_DIR);
    return {
      configLocation: 'repo',
      configDir: REPO_SCREENS_DIR,
      imagesLocation: 'custom',
      imagesDir,
    };
  }

  const configLocation = raw.configLocation === 'custom' ? 'custom' : 'repo';
  const imagesLocation = raw.imagesLocation === 'custom' ? 'custom' : 'same';
  const configDir = configLocation === 'custom'
    ? resolveDir(raw.configDir || DEFAULT_EXTERNAL_DIR)
    : REPO_SCREENS_DIR;
  const imagesDir = imagesLocation === 'custom'
    ? resolveDir(raw.imagesDir || DEFAULT_EXTERNAL_DIR)
    : configDir;

  return { configLocation, configDir, imagesLocation, imagesDir };
}

function loadSettings() {
  try {
    if (!fs.existsSync(SETTINGS_FILE)) return defaultSettings();
    return normalizeSettings(JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8')));
  } catch {
    return defaultSettings();
  }
}

function saveSettings(settings) {
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify({
    configLocation: settings.configLocation,
    configDir: settings.configLocation === 'custom' ? settings.configDir : undefined,
    imagesLocation: settings.imagesLocation,
    imagesDir: settings.imagesLocation === 'custom' ? settings.imagesDir : undefined,
  }, null, 2) + '\n', 'utf8');
}

function destinations(settings) {
  const configRoot = settings.configLocation === 'custom' ? settings.configDir : REPO_SCREENS_DIR;
  const imagesRoot = settings.imagesLocation === 'custom' ? settings.imagesDir : configRoot;
  return {
    configRoot,
    imagesRoot,
    split: path.resolve(configRoot) !== path.resolve(imagesRoot),
  };
}

function sanitizeScreenFolder(raw) {
  const kebab = String(raw ?? '')
    .trim()
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
  if (!kebab || kebab.includes('..')) return '';
  return kebab;
}

function sanitizePngFilename(raw) {
  const base = path.basename(String(raw ?? ''));
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*\.png$/.test(base)) return '';
  return base;
}

function decodeDataUrl(dataUrl) {
  const match = /^data:([^;]+);base64,(.+)$/.exec(String(dataUrl ?? ''));
  if (!match) throw new Error('Expected a base64 data URL');
  return Buffer.from(match[2], 'base64');
}

function assertInsideRoot(root, target) {
  const relative = path.relative(path.resolve(root), path.resolve(target));
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('Refusing to write outside the chosen folder.');
  }
}

function displayPath(absPath) {
  const rel = path.relative(PROJECT_ROOT, absPath);
  if (rel && !rel.startsWith('..') && !path.isAbsolute(rel)) return rel.split(path.sep).join('/');
  return absPath;
}

function relativeImport(fromDir, absFile) {
  let rel = path.relative(fromDir, absFile).split(path.sep).join('/');
  if (!rel.startsWith('.')) rel = `./${rel}`;
  return rel;
}

function screenExportName(folder) {
  const parts = folder.split('-').filter(Boolean);
  let camel = parts.map((part, i) => (i === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1))).join('');
  if (!camel) camel = 'my';
  if (/^[0-9]/.test(camel)) camel = `screen${camel}`;
  return `${camel}Screen`;
}

function titleCase(folder) {
  return folder.split('-').filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function generateConfigTs({ folder, elements, configDir, split }) {
  const exportName = screenExportName(folder);
  const title = titleCase(folder);
  const screenConfigImport = relativeImport(configDir, path.join(PROJECT_ROOT, 'src', 'screen-config.js'));
  const typesImport = relativeImport(configDir, path.join(PROJECT_ROOT, 'src', 'types.js'));
  const imported = split ? '{ defineScreen, screenAssetsDir }' : '{ defineScreen }';
  const baseDirLine = split
    ? `  baseDir: screenAssetsDir('${folder}', __dirname),`
    : '  baseDir: __dirname,';
  const comment = split
    ? ' * PNG templates are loaded from the images folder configured in the Template Manager.\n *'
    : ' *';
  const elementBlocks = elements.map((el) =>
    `    {\n      name: '${el.name}',\n      template: '${el.filename}',\n      type: ElementType.${el.type.toUpperCase()},\n    }`
  ).join(',\n');

  return `import ${imported} from '${screenConfigImport}';
import { ElementType } from '${typesImport}';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * ${title} screen configuration
${comment}
 */
export const ${exportName} = defineScreen({
  name: '${folder}',
${baseDirLine}
  elements: [
${elementBlocks}
  ],
});
`;
}

function listScreens(screensDir) {
  if (!fs.existsSync(screensDir)) return [];
  return fs.readdirSync(screensDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
    .map((entry) => {
      const dir = path.join(screensDir, entry.name);
      const templatesDir = path.join(dir, 'templates');
      const templates = fs.existsSync(templatesDir)
        ? fs.readdirSync(templatesDir).filter((f) => f.endsWith('.png'))
        : [];
      return {
        name: entry.name,
        hasConfig: fs.existsSync(path.join(dir, 'config.ts')),
        hasBlank: fs.existsSync(path.join(dir, 'blank.png')),
        templateCount: templates.length,
      };
    });
}

function statusPayload() {
  const settings = loadSettings();
  const dest = destinations(settings);
  return {
    ok: true,
    configLocation: settings.configLocation,
    configDir: displayPath(dest.configRoot),
    configDirAbs: dest.configRoot,
    imagesLocation: settings.imagesLocation,
    imagesDir: displayPath(dest.imagesRoot),
    imagesDirAbs: dest.imagesRoot,
    split: dest.split,
    repoScreensDir: 'tests/screens',
    defaultExternalDir: process.env.OCR_SCREENS_DIR?.trim()
      ? resolveDir(process.env.OCR_SCREENS_DIR)
      : DEFAULT_EXTERNAL_DIR,
    settingsFile: SETTINGS_FILE,
    screens: listScreens(dest.configRoot),
  };
}

function sendJson(res, status, body) {
  const json = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(json),
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(json);
}

function sendText(res, status, body, contentType = 'text/plain; charset=utf-8') {
  res.writeHead(status, {
    'Content-Type': contentType,
    'Access-Control-Allow-Origin': '*',
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error('Request too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function applySettings(payload) {
  const settings = normalizeSettings(payload);
  saveSettings(settings);
  return { status: 200, body: statusPayload() };
}

function writeScreen(payload) {
  const settings = normalizeSettings(payload);
  saveSettings(settings);
  const dest = destinations(settings);

  const screenName = sanitizeScreenFolder(payload.screenName);
  if (!screenName) {
    return { status: 400, body: { error: 'Enter a valid screen name (letters, numbers, hyphens).' } };
  }

  const configDir = path.join(dest.configRoot, screenName);
  const imagesDir = path.join(dest.imagesRoot, screenName);
  const templatesDir = path.join(imagesDir, 'templates');
  assertInsideRoot(dest.configRoot, configDir);
  assertInsideRoot(dest.imagesRoot, imagesDir);

  const exists = fs.existsSync(path.join(configDir, 'config.ts'))
    || fs.existsSync(path.join(imagesDir, 'blank.png'));

  if (exists && !payload.overwrite) {
    return {
      status: 409,
      body: {
        error: `Screen "${screenName}" already exists.`,
        screenName,
        configPath: displayPath(path.join(configDir, 'config.ts')),
        imagesPath: displayPath(imagesDir),
      },
    };
  }

  const templates = Array.isArray(payload.templates) ? payload.templates : [];
  if (templates.length === 0) {
    return { status: 400, body: { error: 'Save at least one template before exporting.' } };
  }
  if (templates.length > 100) {
    return { status: 400, body: { error: 'Too many templates (max 100).' } };
  }

  let blankPng;
  try {
    blankPng = decodeDataUrl(payload.blankPng);
  } catch {
    return { status: 400, body: { error: 'Load a blank form image before exporting.' } };
  }

  const decodedTemplates = [];
  for (const template of templates) {
    const filename = sanitizePngFilename(template.filename);
    if (!filename) {
      return { status: 400, body: { error: `Invalid template filename: ${template.filename}` } };
    }
    const type = String(template.type || 'other').toLowerCase();
    try {
      decodedTemplates.push({
        name: template.name || filename.replace(/\.png$/, ''),
        filename,
        type,
        bytes: decodeDataUrl(template.dataUrl),
      });
    } catch {
      return { status: 400, body: { error: `Could not decode template image: ${filename}` } };
    }
  }

  const configTs = generateConfigTs({
    folder: screenName,
    elements: decodedTemplates,
    configDir,
    split: dest.split,
  });

  fs.mkdirSync(configDir, { recursive: true });
  fs.mkdirSync(templatesDir, { recursive: true });
  fs.writeFileSync(path.join(configDir, 'config.ts'), configTs, 'utf8');
  fs.writeFileSync(path.join(imagesDir, 'blank.png'), blankPng);

  const written = [
    displayPath(path.join(configDir, 'config.ts')),
    displayPath(path.join(imagesDir, 'blank.png')),
  ];

  for (const template of decodedTemplates) {
    const destFile = path.join(templatesDir, template.filename);
    fs.writeFileSync(destFile, template.bytes);
    written.push(displayPath(destFile));
  }

  return {
    status: exists ? 200 : 201,
    body: {
      ok: true,
      screenName,
      exportName: screenExportName(screenName),
      split: dest.split,
      configPath: displayPath(path.join(configDir, 'config.ts')),
      imagesPath: displayPath(imagesDir),
      configTs,
      files: written,
    },
  };
}

function serveHtml(res) {
  if (!fs.existsSync(HTML_FILE)) {
    sendText(res, 500, 'template-manager.html is missing.');
    return;
  }
  sendText(res, 200, fs.readFileSync(HTML_FILE), 'text/html; charset=utf-8');
}

async function handle(req, res) {
  const url = new URL(req.url ?? '/', `http://${req.headers.host || 'localhost'}`);

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/template-manager.html')) {
    serveHtml(res);
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/status') {
    sendJson(res, 200, statusPayload());
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/screens') {
    sendJson(res, 200, { screens: listScreens(destinations(loadSettings()).configRoot) });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/settings') {
    let payload;
    try {
      payload = JSON.parse((await readBody(req)).toString('utf8'));
    } catch (err) {
      sendJson(res, 400, { error: err.message || 'Invalid JSON body.' });
      return;
    }
    try {
      const result = applySettings(payload);
      sendJson(res, result.status, result.body);
    } catch (err) {
      sendJson(res, 400, { error: err.message || 'Could not save settings.' });
    }
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/screens') {
    let payload;
    try {
      payload = JSON.parse((await readBody(req)).toString('utf8'));
    } catch (err) {
      sendJson(res, 400, { error: err.message || 'Invalid JSON body.' });
      return;
    }
    try {
      const result = writeScreen(payload);
      sendJson(res, result.status, result.body);
    } catch (err) {
      sendJson(res, 400, { error: err.message || 'Could not save screen.' });
    }
    return;
  }

  sendJson(res, 404, { error: 'Not found' });
}

function openBrowser(url) {
  const command = process.platform === 'darwin'
    ? `open "${url}"`
    : process.platform === 'win32'
      ? `start "" "${url}"`
      : `xdg-open "${url}"`;
  exec(command, () => {});
}

function listen(port) {
  const server = http.createServer((req, res) => {
    handle(req, res).catch((err) => {
      console.error(err);
      sendJson(res, 500, { error: 'Internal server error' });
    });
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE' && port < DEFAULT_PORT + 10) {
      listen(port + 1);
      return;
    }
    console.error(err);
    process.exit(1);
  });

  server.listen(port, () => {
    const dest = destinations(loadSettings());
    const url = `http://localhost:${port}/`;
    console.log(`Template Manager: ${url}`);
    console.log(`config.ts → ${dest.configRoot}`);
    console.log(`images    → ${dest.imagesRoot}`);
    openBrowser(url);
  });
}

listen(DEFAULT_PORT);
