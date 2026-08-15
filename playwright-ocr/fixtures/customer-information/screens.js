const SECTIONS = {
  'html-login': [
    { name: 'Sign In', elements: ['username', 'password', 'signIn'] },
  ],
  'html-customer-information': [
    {
      name: 'Customer',
      elements: [
        'customerNumber', 'name', 'address', 'cityState', 'email',
        'vin', 'homePhone', 'birthdate', 'primaryContactMethod', 'active',
      ],
    },
    {
      name: 'Vehicle',
      elements: [
        'stockNo', 'year', 'make', 'model',
        'delivered', 'odometer', 'color', 'doNotCall',
      ],
    },
  ],
};

const treeEl = document.getElementById('tree');
const stageEl = document.getElementById('stage');
const statusEl = document.getElementById('status');
const nameEl = document.getElementById('preview-name');
const toggleEl = document.getElementById('shot-toggle');
const openLive = document.getElementById('open-live');

let screens = [];
let activeName = '';
let shotKind = 'blank';
let hover = null;
let image = null;
let canvas = null;
const closed = new Set();

function byName(list, name) {
  return list.find((item) => item.name === name);
}

function screenOf(name) {
  return byName(screens, name);
}

function elementOf(screen, name) {
  return byName(screen.elements, name);
}

function partRect(element, part) {
  return {
    x: element.x + part.x,
    y: element.y + part.y,
    width: part.width,
    height: part.height,
  };
}

function sectionOf(screen, elementName) {
  return (SECTIONS[screen.name] || []).find((section) => section.elements.includes(elementName));
}

function sectionRects(screen, section) {
  return section.elements
    .map((name) => elementOf(screen, name))
    .filter(Boolean);
}

function unionRect(rects, pad = 10) {
  if (!rects.length) return null;
  let x1 = Infinity;
  let y1 = Infinity;
  let x2 = -Infinity;
  let y2 = -Infinity;
  for (const rect of rects) {
    x1 = Math.min(x1, rect.x);
    y1 = Math.min(y1, rect.y);
    x2 = Math.max(x2, rect.x + rect.width);
    y2 = Math.max(y2, rect.y + rect.height);
  }
  return {
    x: x1 - pad,
    y: y1 - pad,
    width: x2 - x1 + pad * 2,
    height: y2 - y1 + pad * 2,
  };
}

function sectionRect(screen, section) {
  return unionRect(sectionRects(screen, section));
}

function highlightFor(target) {
  if (!target) return { section: null, element: null, part: null };
  const screen = screenOf(target.screen);
  if (!screen) return { section: null, element: null, part: null };
  if (target.kind === 'screen') return { section: null, element: null, part: null };
  if (target.kind === 'section') {
    const section = byName(SECTIONS[screen.name] || [], target.section);
    return { section: section ? sectionRect(screen, section) : null, element: null, part: null };
  }
  const element = elementOf(screen, target.element);
  if (!element) return { section: null, element: null, part: null };
  const section = sectionOf(screen, element.name);
  const part = target.part ? byName(element.parts || [], target.part) : null;
  return {
    section: section ? sectionRect(screen, section) : unionRect([element]),
    element,
    part: part ? partRect(element, part) : null,
  };
}

function statusText(target) {
  if (!target) {
    const screen = screenOf(activeName);
    return screen
      ? `${screen.name} · ${screen.elements.length} elements`
      : 'html-login · html-customer-information';
  }
  if (target.kind === 'screen') return `${target.screen} · click to make active`;
  if (target.kind === 'section') return `${target.screen} / ${target.section}`;
  if (target.part) {
    const screen = screenOf(target.screen);
    const element = screen && elementOf(screen, target.element);
    const part = element && byName(element.parts || [], target.part);
    const rect = element && part ? partRect(element, part) : null;
    return rect
      ? `${target.element}.${target.part} in ${target.element} · ${rect.width}×${rect.height} at ${rect.x},${rect.y}`
      : `${target.element}.${target.part}`;
  }
  const screen = screenOf(target.screen);
  const element = screen && elementOf(screen, target.element);
  return element
    ? `${element.name} · ${element.type || 'field'} · ${element.width}×${element.height} at ${element.x},${element.y}`
    : target.element;
}

function sameTarget(a, b) {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.kind === b.kind
    && a.screen === b.screen
    && a.section === b.section
    && a.element === b.element
    && a.part === b.part;
}

function setHover(target) {
  if (sameTarget(hover, target)) return;
  hover = target;
  for (const row of treeEl.querySelectorAll('[data-target]')) {
    row.classList.toggle('hot', sameTarget(JSON.parse(row.dataset.target), target));
  }
  statusEl.textContent = statusText(target);
  drawOverlay();
}

function drawBox(ctx, scale, rect, fill, stroke, width) {
  ctx.fillStyle = fill;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.rect(rect.x * scale, rect.y * scale, rect.width * scale, rect.height * scale);
  ctx.fill();
  ctx.stroke();
}

function drawOverlay() {
  if (!canvas || !image) return;
  const scale = canvas.width / image.naturalWidth;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const boxes = highlightFor(hover);
  if (!boxes.section && !boxes.element && !boxes.part) return;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (boxes.section) {
    drawBox(ctx, scale, boxes.section, 'rgba(110, 168, 254, 0.12)', 'rgba(110, 168, 254, 0.85)', 2);
  }
  if (boxes.element) {
    drawBox(ctx, scale, boxes.element, 'rgba(75, 200, 120, 0.18)', '#4bc878', 2);
  }
  if (boxes.part) {
    drawBox(ctx, scale, boxes.part, 'rgba(79, 193, 255, 0.28)', '#4fc1ff', 2);
  }
}

function hitTest(clientX, clientY) {
  const screen = screenOf(activeName);
  const img = stageEl.querySelector('img');
  if (!screen || !img) return null;
  const rect = img.getBoundingClientRect();
  const x = (clientX - rect.left) * (img.naturalWidth / rect.width);
  const y = (clientY - rect.top) * (img.naturalHeight / rect.height);
  for (const element of screen.elements) {
    for (const part of element.parts || []) {
      const box = partRect(element, part);
      if (x >= box.x && y >= box.y && x <= box.x + box.width && y <= box.y + box.height) {
        return { kind: 'part', screen: screen.name, element: element.name, part: part.name };
      }
    }
    if (
      x >= element.x && y >= element.y
      && x <= element.x + element.width && y <= element.y + element.height
    ) {
      return { kind: 'element', screen: screen.name, element: element.name };
    }
  }
  return { kind: 'screen', screen: screen.name };
}

function renderPreview() {
  const screen = screenOf(activeName);
  if (!screen) {
    nameEl.textContent = 'Select a screen';
    toggleEl.hidden = true;
    openLive.hidden = true;
    stageEl.innerHTML = '<p class="empty">Click a screen in the directory to open it.</p>';
    image = null;
    canvas = null;
    return;
  }
  nameEl.textContent = screen.label;
  toggleEl.hidden = !screen.filled;
  openLive.hidden = false;
  openLive.href = screen.href;
  const src = shotKind === 'filled' && screen.filled ? screen.filled : screen.blank;
  stageEl.innerHTML = `
    <div class="frame">
      <img alt="${screen.label}" src="${src}">
      <canvas></canvas>
    </div>
  `;
  const img = stageEl.querySelector('img');
  canvas = stageEl.querySelector('canvas');
  img.onload = () => {
    image = img;
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    drawOverlay();
  };
}

function nodeKey(target) {
  if (target.kind === 'screen') return `screen:${target.screen}`;
  if (target.kind === 'section') return `section:${target.screen}/${target.section}`;
  if (target.kind === 'element') return `element:${target.screen}/${target.element}`;
  return '';
}

function isOpen(target) {
  const key = nodeKey(target);
  return !key || !closed.has(key);
}

function canToggle(target) {
  if (target.kind === 'screen' || target.kind === 'section') return true;
  if (target.kind === 'element') {
    const screen = screenOf(target.screen);
    const element = screen && elementOf(screen, target.element);
    return Boolean(element?.parts?.length);
  }
  return false;
}

function toggleOpen(target) {
  const key = nodeKey(target);
  if (!key) return;
  if (closed.has(key)) closed.delete(key);
  else closed.add(key);
}

function chevron(target) {
  if (!canToggle(target)) return '<span class="chev"></span>';
  return `<span class="chev">${isOpen(target) ? '▾' : '▸'}</span>`;
}

function activate(name, push) {
  if (!screenOf(name)) return;
  const changed = activeName !== name;
  activeName = name;
  if (changed) {
    closed.delete(`screen:${name}`);
    shotKind = 'blank';
    hover = null;
    for (const button of toggleEl.querySelectorAll('button')) {
      button.classList.toggle('active', button.dataset.shot === 'blank');
    }
    renderPreview();
  }
  renderTree();
  statusEl.textContent = statusText(hover);
  const url = `${location.pathname}?screen=${encodeURIComponent(name)}`;
  if (push) history.pushState({ screen: name }, '', url);
  else history.replaceState({ screen: name }, '', url);
}

function targetFromRow(row) {
  return row?.dataset.target ? JSON.parse(row.dataset.target) : null;
}

function row(target, label, kind, depth, extra = '') {
  const pad = 8 + depth * 14;
  return `<button type="button" class="row ${kind}${target.screen === activeName && kind === 'screen' ? ' active' : ''}" style="padding-left:${pad}px" data-target='${JSON.stringify(target)}'>${extra}<span class="name">${label}</span><span class="kind">${kind}</span></button>`;
}

function renderTree() {
  treeEl.innerHTML = screens.map((screen) => {
    const screenTarget = { kind: 'screen', screen: screen.name };
    const sections = SECTIONS[screen.name] || [{ name: 'Fields', elements: screen.elements.map((el) => el.name) }];
    const kids = sections.map((section) => {
      const sectionTarget = { kind: 'section', screen: screen.name, section: section.name };
      const fields = section.elements.map((name) => elementOf(screen, name)).filter(Boolean);
      const fieldRows = fields.map((element) => {
        const elementTarget = { kind: 'element', screen: screen.name, element: element.name };
        const parts = (element.parts || []).map((part) => (
          row(
            { kind: 'part', screen: screen.name, element: element.name, part: part.name },
            part.name,
            'part',
            3,
            '<span class="chev"></span><span class="icon">·</span>',
          )
        )).join('');
        return `
          ${row(
            elementTarget,
            element.name,
            'element',
            2,
            `${chevron(elementTarget)}<span class="icon">▢</span>`,
          )}
          ${parts ? `<div class="kids"${isOpen(elementTarget) ? '' : ' hidden'}>${parts}</div>` : ''}
        `;
      }).join('');
      return `
        ${row(
          sectionTarget,
          section.name,
          'section',
          1,
          `${chevron(sectionTarget)}<span class="icon">▣</span>`,
        )}
        <div class="kids"${isOpen(sectionTarget) ? '' : ' hidden'}>${fieldRows}</div>
      `;
    }).join('');
    return `
      ${row(
        screenTarget,
        screen.name,
        'screen',
        0,
        `${chevron(screenTarget)}<span class="icon">📁</span>`,
      )}
      <div class="kids"${isOpen(screenTarget) ? '' : ' hidden'}>${kids}</div>
    `;
  }).join('');
}

treeEl.addEventListener('click', (event) => {
  const target = targetFromRow(event.target.closest('[data-target]'));
  if (!target) return;
  if (target.kind === 'screen') {
    const wasInactive = activeName !== target.screen;
    activate(target.screen, true);
    if (wasInactive) return;
  }
  if (canToggle(target)) {
    toggleOpen(target);
    renderTree();
  }
});

treeEl.addEventListener('mouseover', (event) => {
  setHover(targetFromRow(event.target.closest('[data-target]')));
});

treeEl.addEventListener('mouseleave', () => setHover(null));

stageEl.addEventListener('mousemove', (event) => {
  if (!activeName) return;
  setHover(hitTest(event.clientX, event.clientY));
});

stageEl.addEventListener('mouseleave', () => setHover(null));

toggleEl.addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button) return;
  shotKind = button.dataset.shot;
  for (const item of toggleEl.querySelectorAll('button')) {
    item.classList.toggle('active', item === button);
  }
  renderPreview();
});

window.addEventListener('popstate', () => {
  const name = new URLSearchParams(location.search).get('screen') || screens[0]?.name;
  if (name) activate(name, false);
});

async function openExplorer() {
  const res = await fetch('/api/html-screens');
  const body = await res.json();
  screens = body.screens || [];
  for (const screen of screens) closed.add(`screen:${screen.name}`);
  const requested = new URLSearchParams(location.search).get('screen');
  activate(requested && screenOf(requested) ? requested : screens[0]?.name, false);
}

openExplorer().catch((err) => {
  stageEl.innerHTML = `<p class="empty">${err.message}</p>`;
});
