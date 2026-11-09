import fs from 'node:fs';import path from 'node:path';import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);const { chromium } = require('playwright');
const [page_, dir, out, ...calls] = process.argv.slice(2);
const html = fs.readFileSync(page_, 'utf8');
const docs = fs.readdirSync(dir).filter(f => f.endsWith('.json')).map(f => { const d = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); return { id: path.basename(f, '.json'), data: d.data && !d.stages && !d.chapters ? d.data : d }; });
// Мок window.claude: база с уроками, пользователь «me», sample считает запросы.
const MOCK = `(() => {
  const docs = ${JSON.stringify(docs)};
  const store = {};
  window.__smoke = { samples: 0, osc: 0, writes: 0 };
  const P = AudioContext.prototype, co = P.createOscillator, cb = P.createBufferSource;
  P.createOscillator = function () { window.__smoke.osc++; return co.apply(this, arguments); };
  P.createBufferSource = function () { window.__smoke.osc++; return cb.apply(this, arguments); };
  HTMLMediaElement.prototype.play = function () { return Promise.resolve(); };
  const snap = () => ({ docs: docs.map(d => ({ id: d.id, data: () => JSON.parse(JSON.stringify(d.data)) })) });
  const ref = p => ({
    get: async () => p in store ? { exists: true, data: () => store[p] } : { exists: false, data: () => null },
    set: async v => { store[p] = JSON.parse(JSON.stringify(v)); window.__smoke.writes++; },
    update: async v => { store[p] = { ...(store[p] || {}), ...v }; window.__smoke.writes++; },
    onSnapshot: (f) => { setTimeout(() => f(p in store ? { exists: true, data: () => store[p] } : { exists: false }), 0); return () => {}; },
  });
  const db = {
    collection: name => ({ onSnapshot: (f) => { setTimeout(() => f(snap()), 0); return () => {}; }, doc: id => ref(name + '/' + id), get: async () => snap() }),
    doc: p => ref(p.replace('/me/', '/me/')),
  };
  const sample = { json: async () => { window.__smoke.samples++; return {}; }, text: async () => { window.__smoke.samples++; return ''; } };
  window.__store = store;
  window.claude = { use: async k => k === 'db' ? db : k === 'user' ? { id: async () => 'me' } : k === 'sample' ? sample : null };
})();`;



const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, hasTouch: true });
await ctx.addInitScript(MOCK);
fs.writeFileSync('/tmp/md-scr.html', html);
const page = await ctx.newPage(); page.on('dialog', d => d.dismiss());
page.on('pageerror', e => console.log('PAGEERROR', e.message));
await page.goto('file:///tmp/md-scr.html');
await page.waitForTimeout(2500);
let k = 0;
for (const c of calls) {
  try { await page.evaluate(c); } catch (e) { console.log('ERR', c, e.message.slice(0, 200)); }
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${out}/${String(k++).padStart(2, '0')}-${c.replace(/[^a-zA-Z]/g, '').slice(0, 20)}.png`, fullPage: true });
}
await browser.close();
