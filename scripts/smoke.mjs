// Автотест страницы Mein Deutsch перед публикацией.
// Запуск: npm run smoke -- путь/к/странице.html путь/к/папке-с-уроками
//   папка с уроками: JSON-файлы коллекции lessons (ArtifactData list lessons с out_dir).
// Что проверяет, на каждом уроке, на телефоне 390 px:
//   1. нет ошибок JS (pageerror, console.error);
//   2. каждый тип задания отвечает на ответ: в каждом типе, где есть ответы, звучит звук;
//   3. урок доходит до финала, прогресс записывается в базу (data/users/me/progress);
//   4. поля ввода (словарик, «Как сказать», поиск глаголов): быстрый набор
//      не пересоздаёт поле и не шлёт запрос на каждую букву.
// Выход 1, если есть хоть одна проблема.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = await import('playwright')); }

const [page_, dir] = process.argv.slice(2);
if (!page_ || !dir) { console.error('Запуск: npm run smoke -- страница.html папка-с-уроками'); process.exit(2); }
const html = fs.readFileSync(page_, 'utf8');
const docs = fs.readdirSync(dir).filter(f => f.endsWith('.json')).map(f => {
  const d = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  return { id: path.basename(f, '.json'), data: d.data && !d.stages && !d.chapters ? d.data : d };
});
const only = process.env.LESSON;
const lessons = docs.filter(d => !d.id.startsWith('_') && Array.isArray(d.data.stages) && d.data.stages.length && (!only || d.id === only));

let problems = 0;
const bad = m => { problems++; console.log('✗ ' + m); };

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
const tmp = path.join(process.env.TMPDIR || '/tmp', 'md-smoke.html');
fs.writeFileSync(tmp, html);

async function open() {
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e.message || e).slice(0, 200)));
  page.on('console', m => { if (m.type() === 'error' && !/fonts\.g|net::|Failed to load resource/.test(m.text())) errs.push(m.text().slice(0, 200)); });
  page.on('dialog', d => d.dismiss());
  await page.goto('file://' + tmp);
  await page.waitForFunction(() => window.S && S.lessons && S.lessons.length, null, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(300);
  if (!(await page.evaluate(() => typeof S !== 'undefined' && !!(S.lessons || []).length).catch(() => false))) {
    bad(`страница не загрузилась или не видит уроки: ${errs.slice(0, 2).join(' | ') || 'без ошибок в консоли'}`);
    await browser.close(); console.log(`\n${problems} проблем(ы)`); process.exit(1);
  }
  return { page, errs };
}

// Один шаг «ученицы»: если внизу кнопка — жмёт её, иначе отвечает на задание.
const STEP = () => {
  const vis = e => e && e.offsetParent !== null && !e.disabled && getComputedStyle(e).visibility !== 'hidden';
  const app = document.getElementById('app'), dockEl = document.getElementById('dock');
  const fb = dockEl.classList.contains('fb');
  const st = STAGES[stageIdx];
  const type = st ? st.type : view;
  if (view === 'final' || document.querySelector('.done .bigring')) return { done: true };
  const dbtn = document.getElementById('dbtn');
  // поля ввода: заполнить, если пустые
  const f = [...app.querySelectorAll('input:not([type]), input[type=text], textarea')].find(e => vis(e) && !e.value && !e.readOnly);
  if (f && !fb) { f.value = f.tagName === 'TEXTAREA' ? 'Ich habe heute Deutsch gelernt.' : 'x'; f.dispatchEvent(new Event('input', { bubbles: true })); return { type, act: 'fill' }; }
  if (dbtn && vis(dbtn)) { const answer = !fb && /Провер|Готово|Ответ/i.test(dbtn.textContent); dbtn.click(); return { type, act: answer ? 'check' : 'next', fb }; }
  const sel = ['.art', '.opt:not(.sel)', '.ev:not(.set)', '.ph:not(.sel)', '.bank .tile:not(.ghost)', '.letters .tile:not(.used)', '.bld', '.bin', '.sbin', '.sortc button', '.tk', '.sw button'];
  for (const s of sel) { const e = [...app.querySelectorAll(s)].find(vis); if (e) { e.dispatchEvent(new MouseEvent('click', { bubbles: true })); e.click?.call && 0; return { type, act: 'pick:' + s }; } }
  const any = [...app.querySelectorAll('button')].find(b => vis(b) && !b.matches('.back,.x,.hlp,.say,.mark,.sndt,.rulebtn,.vfk,.fbact *'));
  if (any) { any.click(); return { type, act: 'btn' }; }
  return { type, act: 'none' };
};

const perType = {};
async function playLesson(l) {
  const t0 = Date.now();
  const { page, errs } = await open();
  await page.evaluate(id => { const l = S.lessons.find(x => x.id === id) || findLesson(id); showIntro(l); startRun(); }, l.id);
  let steps = 0, stuck = 0, last = '', done = false;
  while (steps++ < 400 && Date.now() - t0 < 120000) {
    await page.waitForTimeout(30);
    const { o0, fb0, w0 } = await page.evaluate(() => ({ o0: __smoke.osc, fb0: document.getElementById('dock').classList.contains('fb'), w0: document.querySelector('#word')?.className || '' }));
    const r = await page.evaluate(STEP).catch(e => ({ act: 'err', e: String(e) }));
    if (r.done) { done = true; break; }
    await page.waitForTimeout(r.act === 'fill' ? 10 : 170);
    const after = await page.evaluate(() => ({ osc: __smoke.osc, fb: document.getElementById('dock').classList.contains('fb'), word: document.querySelector('#word')?.className || '', h: document.getElementById('app').innerHTML.length + '|' + document.getElementById('dock').innerHTML.length + '|' + stageIdx + '|' + doneTasks }));
    const answered = (!fb0 && after.fb) || (after.word !== w0 && /\b(ok|no)\b/.test(after.word));
    if (answered && r.type && r.type !== 'theory') {
      const t = perType[r.type] ||= { answers: 0, sound: 0, lessons: new Set() };
      t.answers++; t.lessons.add(l.id); if (after.osc > o0) t.sound++;
    }
    if (after.h === last && r.act !== 'fill') { if (++stuck > 12) { bad(`${l.id}: урок застрял на этапе «${r.type}» (действие ${r.act})`); break; } } else stuck = 0;
    last = after.h;
  }
  if (!done && !stuck) bad(`${l.id}: урок не дошёл до финала (${steps} шагов)`);
  if (done) {
    await page.waitForTimeout(1800);
    const saved = await page.evaluate(id => { const p = __store['data/users/me/progress']; return !!(p && p.lessons && p.lessons[id]); }, l.id);
    if (!saved) bad(`${l.id}: после финала прогресс не записан в базу`);
  }
  for (const e of [...new Set(errs)]) bad(`${l.id}: ошибка JS: ${e}`);
  console.log(`${done ? '✓' : '·'} ${l.id} (${Math.round((Date.now() - t0) / 1000)} с)`);
  await page.close();
}
{ const q = [...lessons]; await Promise.all(Array.from({ length: 4 }, async () => { while (q.length) await playLesson(q.shift()); })); }

for (const [t, v] of Object.entries(perType)) {
  if (v.sound < v.answers) bad(`тип «${t}»: ${v.answers - v.sound} из ${v.answers} ответов без звука (${[...v.lessons].slice(0, 3).join(', ')})`);
  else console.log(`  ${t}: ответов ${v.answers}, со звуком ${v.sound}`);
}

// Поля ввода: быстрый набор.
{
  const { page, errs } = await open();
  const typeFast = async (label, prep, selector, { maxSamples = 1, text = ['Ich möchte ', 'einen Kaffee bestellen'] } = {}) => {
    await page.evaluate(prep).catch(() => {});
    await page.waitForTimeout(300);
    const el = await page.$(selector);
    if (!el) { console.log(`  · ${label}: поле не найдено, пропуск`); return; }
    await page.evaluate(s => { window.__el = document.querySelector(s); __smoke.samples = 0; }, selector);
    await el.focus();
    // набор как у человека: быстро, с паузой на раздумье посередине
    await page.keyboard.type(text[0], { delay: 35 });
    await page.waitForTimeout(1200);
    await page.keyboard.type(text[1], { delay: 35 });
    await page.waitForTimeout(500);
    const same = await page.evaluate(s => document.querySelector(s) === window.__el && document.activeElement === window.__el, selector);
    if (!same) bad(`${label}: поле пересоздаётся во время набора (дёргается, теряется фокус)`);
    await page.waitForTimeout(2500);
    const n = await page.evaluate(() => __smoke.samples);
    if (n > maxSamples) bad(`${label}: ${n} запросов на одну фразу (нужна пауза перед запросом)`);
    console.log(`  ${same && n <= maxSamples ? '✓' : '✗'} ${label}`);
  };
  await typeFast('словарик: поиск и «Как сказать»', () => showVocab(), '#vq', { text: ['я хотела бы ', 'заказать кофе'] });
  await typeFast('словарь в уроке', () => showDict(), '#dq');
  await typeFast('поиск глаголов', () => showVerbs(), '#vfq');
  for (const e of [...new Set(errs)]) bad(`поля ввода: ошибка JS: ${e}`);
  await page.close();
}

// Игры на главной: «Слово дня» и «Пары» (если они есть на странице).
{
  const { page, errs } = await open();
  const has = await page.evaluate(() => typeof showWordle === 'function' && typeof showPairs === 'function');
  if (!has) console.log('  · игры: на странице нет, пропуск');
  else {
    await page.evaluate(() => showHome()); await page.waitForTimeout(300);
    if (!(await page.$('#go-wordle')) || !(await page.$('#go-pairs'))) bad('игры: на главной нет плиток «Слово дня» и «Пары»');
    else {
      await page.click('#go-wordle'); await page.waitForTimeout(300);
      const W = await page.evaluate(() => wordleToday()?.lemma?.toUpperCase() || '');
      if (!/^[A-ZÄÖÜ]{5}$/.test(W)) bad(`слово дня: нет слова из 5 букв (${W})`);
      else {
        for (const c of W) await page.click(`.kr button[data-k="${c}"]`);
        const o0 = await page.evaluate(() => __smoke.osc);
        await page.click('#dbtn'); await page.waitForTimeout(400);
        const r = await page.evaluate(() => ({ won: !!document.querySelector('.w1res'), saved: !!(__store['data/users/me/progress']?.games?.w?.won) }));
        await page.waitForTimeout(1500);
        const o1 = await page.evaluate(() => __smoke.osc);
        if (!r.won) bad('слово дня: угаданное слово не засчитано');
        if (o1 <= o0) bad('слово дня: после угаданного слова нет звука');
        console.log(`  ${r.won && o1 > o0 ? '✓' : '✗'} слово дня`);
      }
      await page.evaluate(() => showHome()); await page.waitForTimeout(200);
      await page.click('#go-pairs'); await page.waitForTimeout(200); await page.click('#dbtn'); await page.waitForTimeout(300);
      let n = 0;
      for (let k = 0; k < 7; k++) {
        n += await page.evaluate(() => { const a = document.querySelector('.pc[data-s=l]:not(.right)'); if (!a) return 0; const c = document.querySelector(`.pc[data-s=r][data-k="${a.dataset.k}"]`); a.click(); c.click(); return 1; });
        await page.waitForTimeout(300);
      }
      const shown = await page.evaluate(() => parseInt(document.querySelector('#ps b')?.textContent || '0'));
      if (n < 6 || shown !== n) bad(`пары: засчитано ${shown} из ${n} верных пар, новый раунд не появился`);
      else console.log('  ✓ пары');
    }
  }
  for (const e of [...new Set(errs)]) bad(`игры: ошибка JS: ${e}`);
  await page.close();
}

await browser.close();
console.log(problems ? `\n${problems} проблем(ы)` : '\n✓ Автотест прошёл');
process.exit(problems ? 1 : 0);
