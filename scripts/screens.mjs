// Снимки всех экранов Mein Deutsch на телефоне 390 px для канваса «Макеты Mein Deutsch».
// Запуск: npm run screens -- страница.html папка-с-уроками progress.json папка-для-снимков [id,id,...]
//   страница: живая версия (Artifact read), уроки: ArtifactData list lessons с out_dir,
//   progress.json: ArtifactData get data/users/me/progress (реальные данные Алины, чтобы экраны были как у неё).
// Список экранов и как до них дойти: design/screens.json. Высокие экраны снимаются целиком,
// таб-бар и нижняя панель остаются внизу. Снимки в 2x.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = await import('playwright')); }

const [page_, dir, progFile, out, only] = process.argv.slice(2);
if (!page_ || !dir || !progFile || !out) { console.error('Запуск: npm run screens -- страница.html папка-с-уроками progress.json папка-для-снимков [id,id]'); process.exit(2); }
fs.mkdirSync(out, { recursive: true });
// Как в smoke: страница в виде публикации, обёртка до <title> отбрасывается.
let html = fs.readFileSync(page_, 'utf8');
{ const t = html.indexOf('<title>'), b = html.lastIndexOf('<body>', t); if (t > 0 && b >= 0) html = html.slice(b + 6); }
html = '<!doctype html><html><head><meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1"></head><body>' + html;
const docs = fs.readdirSync(dir).filter(f => f.endsWith('.json')).map(f => {
  const d = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  return { id: path.basename(f, '.json'), data: d.data && !d.stages && !d.chapters ? d.data : d };
});
let prog = JSON.parse(fs.readFileSync(progFile, 'utf8'));
if (prog.data && !prog.lessons) prog = prog.data;
const MOCK = `(() => {
  const docs = ${JSON.stringify(docs)};
  const store = { 'data/users/me/progress': ${JSON.stringify(prog)} };
  HTMLMediaElement.prototype.play = function () { return Promise.resolve(); };
  const snap = () => ({ docs: docs.map(d => ({ id: d.id, data: () => JSON.parse(JSON.stringify(d.data)) })) });
  const ref = p => ({
    get: async () => p in store ? { exists: true, data: () => store[p] } : { exists: false, data: () => null },
    set: async v => { store[p] = JSON.parse(JSON.stringify(v)); },
    update: async v => { store[p] = { ...(store[p] || {}), ...v }; },
    onSnapshot: f => { setTimeout(() => f(p in store ? { exists: true, data: () => store[p] } : { exists: false }), 0); return () => {}; },
  });
  const db = { collection: n => ({ onSnapshot: f => { setTimeout(() => f(snap()), 0); return () => {}; }, doc: id => ref(n + '/' + id), get: async () => snap() }), doc: p => ref(p) };
  const sample = { json: async () => ({}), text: async () => '' };
  window.claude = { use: async k => k === 'db' ? db : k === 'user' ? { id: async () => 'me' } : k === 'sample' ? sample : null };
})();`;
const tmp = path.join(process.env.TMPDIR || '/tmp', 'md-screens.html');
fs.writeFileSync(tmp, html);

const shots = JSON.parse(fs.readFileSync(new URL('../design/screens.json', import.meta.url), 'utf8'))
  .filter(s => !only || only.split(',').includes(s.id));
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true });
await ctx.addInitScript(MOCK);
let bad = 0;
for (const s of shots) {
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e.message)));
  p.on('dialog', d => d.dismiss());
  await p.goto('file://' + tmp);
  await p.waitForFunction(() => window.S && S.lessons && S.lessons.length, null, { timeout: 10000 }).catch(() => {});
  await p.addStyleTag({ content: '*,*:before,*:after{animation-duration:0s!important;animation-delay:0s!important;transition:none!important}' });
  await p.waitForTimeout(500);
  try { for (const step of s.js) { await p.evaluate(step); await p.waitForTimeout(s.wait || 500); } } catch (e) { errs.push('шаг: ' + e.message); }
  await p.waitForTimeout(600);
  if (!s.fold) {
    const h = await p.evaluate(() => Math.max(document.documentElement.scrollHeight, document.body.scrollHeight));
    await p.setViewportSize({ width: 390, height: Math.min(h, 6000) });
    await p.waitForTimeout(400);
  }
  await p.screenshot({ path: path.join(out, s.id + '.png') });
  if (errs.length) bad++;
  console.log((errs.length ? '✗ ' : '✓ ') + s.id + (errs.length ? ': ' + errs.slice(0, 2).join(' | ') : ''));
  await p.close();
}
await browser.close();
process.exit(bad ? 1 : 0);
