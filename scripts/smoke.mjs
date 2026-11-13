// Автотест страницы Mein Deutsch перед публикацией.
// Запуск: npm run smoke -- путь/к/странице.html путь/к/папке-с-уроками
//   папка с уроками: JSON-файлы коллекции lessons (ArtifactData list lessons с out_dir).
// Что проверяет, на каждом уроке, на телефоне 390 px:
//   1. нет ошибок JS (pageerror, console.error);
//   2. каждый тип задания отвечает на ответ: в каждом типе, где есть ответы, звучит звук;
//   3. урок доходит до финала, прогресс записывается в базу (data/users/me/progress);
//   4. поля ввода (словарик, «Как сказать», поиск глаголов): быстрый набор
//      не пересоздаёт поле и не шлёт запрос на каждую букву;
//   5. тренировка слов: звук прошлого слова не играет на новом экране,
//      после верного ответа всегда плашка с переводом;
//   6. «Род слова»: 43 правила, 1005 слов, 693 подсказки, поиск, карточка, раунд «Тренировать» до итога;
//   7. главная на ноутбуке и планшете (820–1440 px): в «Пять минут» каждый ряд заполнен целиком,
//      нет карточки с пустотой справа, страница не шире окна.
//   8. «Собери фразу»: любой верный порядок засчитывается, первая плашка без заглавной буквы,
//      повтор Perfekt спрягает haben/sein по подлежащему; «Спросить про ошибку» → «Почему не мой вариант?»
//      засчитывает ответ, если преподаватель согласен.
//   9. «Как сказать»: в историю не попадают недописанные запросы и опечатки; просмотр прошлого
//      запроса и повтор в том же разговоре не считаются повтором; вопросы тоже в истории, разговор
//      остаётся после перезагрузки, у глагола видны прошедшие формы.
//  10. «Книга»: разделы книги не в общем списке, карта 60 уроков + 6 контрольных, раздел открывается, видео с секундой.
// Выход 1, если есть хоть одна проблема.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = await import('playwright')); }

const [page_, dir] = process.argv.slice(2);
if (!page_ || !dir) { console.error('Запуск: npm run smoke -- страница.html папка-с-уроками'); process.exit(2); }
// Страницу проверяем такой, какой её отдаёт публикация: обёртка до <title> (doctype, head, первый <style>) отбрасывается.
// В ноябре 2026 стили «Рода слова» попали в эту обёртку, локально всё было красиво, а у Алины — голый текст.
let html = fs.readFileSync(page_, 'utf8');
{ const t = html.indexOf('<title>'), b = html.lastIndexOf('<body>', t); if (t > 0 && b >= 0) html = html.slice(b + 6); }
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
  if (l.tp) {
    // «К тесту»: раздел запускается с экрана подготовки, не из коллекции уроков
    const ok = await page.evaluate(k => { if (typeof tpStart !== 'function' || !tpActive()) return false; showTest(); tpStart(k); return view === 'run' || !!document.querySelector('.stagecard,.task'); }, l.tp);
    if (!ok) { console.log(`· ${l.id}: раздела нет на странице, пропуск`); await page.close(); return; }
  } else
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
    const saved = await page.evaluate(([id, tp]) => { const p = __store['data/users/me/progress']; return !!(p && p.lessons && p.lessons[id]) && (!tp || Object.keys(p.tp || {}).some(k => k.length > 2)); }, [l.id, !!l.tp]);
    if (!saved) bad(`${l.id}: после финала прогресс не записан в базу`);
  }
  for (const e of [...new Set(errs)]) bad(`${l.id}: ошибка JS: ${e}`);
  console.log(`${done ? '✓' : '·'} ${l.id} (${Math.round((Date.now() - t0) / 1000)} с)`);
  await page.close();
}
{ const q = [...lessons, ...(only ? [] : ['wl0', 'wl5', 'modal', 'pres', 'praet', 'formen', 'mock'].map(k => ({ id: 'tp-' + k, tp: k })))]; await Promise.all(Array.from({ length: 4 }, async () => { while (q.length) await playLesson(q.shift()); })); }

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

// «Род слова» и «Тренировать» (перенос Artikelregen, 2026-11-12): ничего из правил не потерялось,
// поиск не пересоздаёт поле, карточка открывается и листается, раунд доходит до итога и пишет прогресс игры.
{
  const { page, errs } = await open();
  const has = await page.evaluate(() => typeof showRod === 'function' && typeof ARD === 'object');
  if (!has) console.log('  · род слова: на странице нет, пропуск');
  else {
    const c = await page.evaluate(() => ({ r: ARD.R.length, w: ARD.W.length, h: Object.keys(ARD.H).length, sec: ARD.R.filter(r => r.sec && r.lead && r.ex1 && r.ex1.emoji).length }));
    if (c.r < 43 || c.w < 1005 || c.h < 693 || c.sec < 43) bad(`род слова: правил ${c.r}/43, полных ${c.sec}/43, слов ${c.w}/1005, подсказок ${c.h}/693`);
    // стили на месте: плитка на главной и вход в раунд — с подложкой, а не голым текстом
    await page.evaluate(() => { showHome(); }); await page.waitForTimeout(250);
    const look = await page.evaluate(() => [...document.querySelectorAll('.mgame')].map(e => { const c = getComputedStyle(e); return { k: e.className, bg: c.backgroundColor, h: e.getBoundingClientRect().height }; }));
    for (const t of look) if (/rgba\(0, 0, 0, 0\)|transparent/.test(t.bg) || t.h < 60) bad(`главная: плитка «${t.k}» без подложки или сплющена (${t.bg}, ${Math.round(t.h)}px)`);
    if (!look.some(t => /\bar\b/.test(t.k))) bad('главная: нет плитки «Тренировать» в «Пять минут»');
    await page.evaluate(() => { showVocab(); }); await page.waitForTimeout(200);
    await page.click('.vart.der'); await page.waitForTimeout(300);
    const cells = await page.$$eval('.rg-xc', a => a.length);
    const sty = await page.evaluate(() => { const e = document.querySelector('.rg-entry'), x = document.querySelector('.rg-xc'); return { e: e && getComputedStyle(e).display, x: x && getComputedStyle(x).backgroundColor }; });
    if (sty.e !== 'grid' || !sty.x || /rgba\(0, 0, 0, 0\)/.test(sty.x)) bad(`род слова: стили не применились (вход ${sty.e}, ячейка ${sty.x})`);
    if (cells < 43) bad(`род слова: в таблице ${cells} ячеек из 43`);
    const inp = await page.$('#rgq'); await page.evaluate(() => { document.querySelector('#rgq').__k = 1; });
    await inp.type('unte', { delay: 60 }); await page.waitForTimeout(500);
    const sg = await page.evaluate(() => ({ same: document.querySelector('#rgq')?.__k === 1, words: [...document.querySelectorAll('.rg-sg .rg-w')].map(x => x.textContent) }));
    if (!sg.same) bad('род слова: поле поиска пересоздаётся при наборе');
    if (!sg.words.some(w => /Unterricht/.test(w))) bad(`род слова: на «unte» нет Unterricht (${sg.words.join(', ')})`);
    await page.click('.rg-sg[data-card]'); await page.waitForTimeout(400);
    const card = await page.evaluate(() => ({ open: !!document.querySelector('.rg-sheet .rg-card'), lis: document.querySelectorAll('.rg-sheet .rg-gul li').length, pager: document.querySelector('.rg-pager span')?.textContent || '' }));
    if (!card.open || !card.lis) bad('род слова: карточка правила не открылась или пустая');
    const p0 = card.pager; await page.evaluate(() => (document.querySelector('.rg-rnd[data-step="1"]:not([disabled])') || document.querySelector('.rg-rnd[data-step="-1"]')).click()); await page.waitForTimeout(300);
    const p1 = await page.evaluate(() => document.querySelector('.rg-pager span')?.textContent || '');
    if (p0 === p1) bad('род слова: карточка не листается');
    await page.evaluate(() => document.querySelector('.rg-sbtn [data-rg="rule"]').click()); await page.waitForTimeout(500);
    if (!(await page.$('.rg-play .rg-fall'))) bad('род слова: «Тренировать» из карточки не запустил раунд');
    await page.evaluate(() => { rgStop(); rgMenu('home'); }); await page.waitForTimeout(200);
    await page.click('[data-start="mix"]'); await page.waitForTimeout(400);
    const o0 = await page.evaluate(() => __smoke.osc);
    let n = 0, wrong = 0;
    for (let k = 0; k < 40; k++) {
      const r = await page.evaluate(k => { if (typeof RGS === 'undefined' || !RGS || !RGS.cur || RGS.cur.done) return document.querySelector('.rg-play') ? 'wait' : 'end'; const g = RGS.cur.x.g; const ans = k % 7 === 3 ? (g === 'der' ? 'die' : 'der') : g; document.querySelector(`.rg-keys [data-a="${ans}"]`).dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); return ans === g ? 'ok' : 'bad'; }, k);
      if (r === 'end') break; if (r === 'ok' || r === 'bad') n++;
      if (r === 'bad') { wrong++; await page.waitForTimeout(150); const fb = await page.$('.rg-fb [data-next]'); if (!fb) { bad('род слова: после ошибки нет панели с «Дальше»'); break; } await fb.click(); }
      await page.waitForTimeout(r === 'ok' ? 720 : 200);
    }
    await page.waitForTimeout(1500);
    const res = await page.evaluate(() => ({ done: !!document.querySelector('.rg-res'), art: __store['data/users/me/progress']?.art || null, osc: __smoke.osc }));
    if (!res.done) bad(`род слова: раунд не дошёл до итога (ответов ${n})`);
    else if (!res.art || !res.art.rounds || Object.keys(res.art.w || {}).length < 10) bad('род слова: прогресс игры не записан в базу');
    if (res.osc <= o0) bad('род слова: в раунде нет звука ответа');
    // слова из словаря: сохранённое существительное попадает в «Мои слова» и в умный раунд, ошибка видна на карточке слова
    const my = await page.evaluate(() => { S.progress.saved = (S.progress.saved || []).concat([{ id: 'smk1', de: 'der Tisch', ru: 'стол', t: Date.now(), src: 'smoke' }, { id: 'smk2', de: 'die Smokewelt', ru: 'тест', t: Date.now() + 1, src: 'smoke' }]);
      const pool = rgPool('my').map(x => x.w), mix = new Set(); for (let i = 0; i < 6; i++) rgPick('mix').forEach(x => mix.add(x.w));
      rgP().w.Smokewelt = { ok: 0, bad: 2, t: Date.now() }; const e = { de: 'die Smokewelt', own: null };
      return { pool, inMix: mix.has('Tisch') || mix.has('Smokewelt'), note: rgWordNote(e) + (String(showWord).includes('rgWordNote(e)') ? '' : ' нет в showWord') }; });
    if (!my.pool.includes('Tisch') || !my.pool.includes('Smokewelt')) bad(`род слова: «Мои слова» не видят сохранённые слова (${my.pool.join(', ')})`);
    if (!my.inMix) bad('род слова: слова из словаря не попадают в умный раунд');
    if (!/Путаешь род/.test(my.note) || /нет в showWord/.test(my.note)) bad('род слова: на карточке слова нет отметки об ошибках в роде');
    if (res.done && res.art && res.osc > o0) console.log(`  ✓ род слова: таблица, поиск, карточка, раунд (${n} ответов, ${wrong} ошибок)`);
  }
  for (const e of [...new Set(errs)]) bad(`род слова: ошибка JS: ${e}`);
  await page.close();
}

// «Книга» (2026-11-13): уроки-разделы книги не попадают в общий список уроков, карта книги показывает
// все 60 уроков и контрольные, экран урока открывает готовый раздел, у вступления есть ссылка на видео с секундой.
if (!only) {
  const { page, errs } = await open();
  const r = await page.evaluate(async () => {
    const out = [], w = ms => new Promise(f => setTimeout(f, ms));
    if (typeof showBook !== 'function') return ['нет раздела'];
    const U = S.book || [];
    if ((S.lessons || []).some(l => l.book && l.book.s)) out.push('урок книги попал в общий список уроков');
    showLessons(); await w(50);
    if (!document.getElementById('go-book')) out.push('на вкладке «Уроки» нет входа в книгу');
    showBook(); await w(50);
    const folds = document.querySelectorAll('.bkfold').length;
    if (folds > 4) out.push(`свёрнуто ${folds} частей: открытыми должны быть A1, A2 и части с готовыми разделами`);
    BOOK.parts.forEach(p => BKOPEN[p.lv] = true); showBook(); await w(50);
    const rows = document.querySelectorAll('.bkrow');
    if (rows.length !== 66) out.push(`на карте ${rows.length} строк вместо 60 уроков и 6 контрольных`);
    if (document.documentElement.scrollWidth > innerWidth + 1) out.push('карта шире экрана');
    if (U.length) {
      const n = +U[0].book.l; document.querySelector(`button.bkrow[data-n="${n}"]`).click(); await w(50);
      const sec = document.querySelector('button.bksec');
      if (!sec) out.push(`в уроке ${n} нет готового раздела`);
      else { sec.click(); await w(80);
        if (view !== 'intro') out.push('раздел не открылся');
        const v = document.querySelector('.bkvid');
        if (lesson && lesson.book && lesson.book.video && !(v && /youtu\.be\/[\w-]{11}\?t=\d+/.test(v.href))) out.push('у раздела нет ссылки на видео с секундой');
        document.getElementById('back').click(); await w(50);
        if (view !== 'bookl') out.push('«назад» из раздела ведёт не к уроку книги');
      }
    }
    return out;
  }).catch(e => ['ошибка: ' + e]);
  if (r[0] === 'нет раздела') console.log('· книга: раздела нет на странице, пропуск');
  else { for (const x of r) bad('книга: ' + x); for (const e of [...new Set(errs)]) bad(`книга: ошибка JS: ${e}`); console.log(`  ${r.length || errs.length ? '✗' : '✓'} книга: карта, урок, раздел, видео`); }
  await page.close();
}

// Тренировка слов: звук прошлого слова не звучит на новом экране, после верного ответа всегда плашка с переводом.
// Баг дошёл до Алины 2026-11-10: звук грузился дольше, чем она нажимала «Дальше», и играл уже поверх следующего слова.
{
  const { page, errs } = await open();
  const has = await page.evaluate(() => typeof startReview === 'function' && typeof vocabSpec === 'function' && typeof aplay === 'function' && typeof adoc === 'function');
  if (!has) console.log('  · тренировка слов: на странице нет, пропуск');
  else {
    const words = await page.evaluate(() => {
      // звук каждого слова «грузится» 700 мс, как при медленной сети
      window.__late = []; window.__req = {};
      AIDX = new Proxy({}, { get: (_, h) => h }); aindex = () => Promise.resolve(AIDX);
      adoc = h => new Promise(r => setTimeout(() => { AURL[h] = 'data:audio/mpeg;base64,AAAA#' + h; r(true); }, 700));
      const say0 = say; say = function (t, slow) { __req[ahash(akey(t))] = { t, task: document.querySelector('.task') }; return say0(t, slow); };
      const ap0 = aplay; aplay = function (url, slow, fail) { const q = __req[url.split('#')[1]]; if (q && q.task !== document.querySelector('.task')) __late.push(q.t); return ap0(url, slow, () => {}); };
      const L = []; (S.lessons || []).forEach(l => (l.vocab || []).forEach(g => (g.w || []).forEach(w => { if (w[0] && w[1] && L.length < 5 && !L.some(x => x.de === w[0])) L.push({ de: plainTxt(w[0]), ru: splitRu(plainTxt(w[1]))[0] }); })));
      const st = { title: 'Словарик', shape: 'cloud', color: '#5D7F95' };
      // первые карточки «выбери перевод», последние «выбери слово» (box 2)
      startReview(L.map((x, k) => ({ id: 'v|b:smoke' + k, t: 'vocab', item: { ...x, note: '', ex: '' }, st, skill: 'Словарик', box: k < 3 ? 0 : 2, lapses: 0, due: 0 })), { title: 'Слова дня' });
      return L;
    });
    await page.waitForTimeout(200);
    if (!(await page.$('.task')) && (await page.$('#dbtn'))) { await page.click('#dbtn'); await page.waitForTimeout(200); }
    let shown = 0, noFb = 0, noTr = 0;
    for (let k = 0; k < words.length && (await page.$('.task .opt')); k++) {
      const ok = await page.evaluate(W => {
        const opts = [...document.querySelectorAll('.task .opt')], q = document.querySelector('.task .bubble').textContent;
        const w = W.find(x => opts.some(o => o.dataset.o === x.ru) && q.includes(x.de.replace(/^(der|die|das) /, ''))) || W.find(x => opts.some(o => o.dataset.o === x.de) && q.includes(x.ru));
        if (!w) return false; const b = opts.find(o => o.dataset.o === w.ru && q.includes(w.de.replace(/^(der|die|das) /, ''))) || opts.find(o => o.dataset.o === w.de);
        b.click(); return true;
      }, words);
      if (!ok) break; shown++;
      await page.waitForTimeout(350);
      const fb = await page.evaluate(() => { const d = document.getElementById('dock'); return { ok: d.classList.contains('fb') && d.classList.contains('ok') && !!document.getElementById('dbtn'), tr: !!d.querySelector('.vtrn') }; });
      if (!fb.ok) noFb++; else if (!fb.tr) noTr++;
      // «Дальше» раньше, чем звук успел загрузиться
      await page.evaluate(() => document.getElementById('dbtn')?.click());
      await page.waitForTimeout(150);
    }
    await page.waitForTimeout(1200);
    const late = await page.evaluate(() => __late);
    if (shown < 3) bad(`тренировка слов: показано только ${shown} карточек из ${words.length}`);
    if (noFb) bad(`тренировка слов: после ${noFb} верных ответов нет плашки «Верно» с кнопкой «Дальше»`);
    if (noTr) bad(`тренировка слов: в ${noTr} плашках после верного ответа нет перевода (плашки должны быть одинаковыми)`);
    if (late.length) bad(`тренировка слов: звук прошлого слова играет на новом экране (${late.slice(0, 3).join(', ')})`);
    console.log(`  ${shown >= 3 && !noFb && !noTr && !late.length ? '✓' : '✗'} тренировка слов: звук и плашка`);
  }
  for (const e of [...new Set(errs)]) bad(`тренировка слов: ошибка JS: ${e}`);
  await page.close();
}

// 7. Главная на широком экране. 13.11.2026 у Алины на ноутбуке «Тренировать» шла на всю ширину между
// «Словом дня» и «Парами», и те стояли по одной с пустотой справа. Смартфонный прогон этого не видел.
{
  const SHOTS = process.env.SMOKE_SHOTS;
  for (const width of [820, 1100, 1280, 1440]) {
    const c = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });
    await c.addInitScript(MOCK);
    const page = await c.newPage();
    const errs = [];
    page.on('pageerror', e => errs.push(String(e.message || e).slice(0, 200)));
    await page.goto('file://' + tmp);
    await page.waitForSelector('.mgames .mgame', { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(400);
    const r = await page.evaluate(() => {
      const box = document.querySelector('.mgames');
      if (!box) return { none: true };
      const cs = getComputedStyle(box), W = box.getBoundingClientRect().width, gap = parseFloat(cs.columnGap) || 0;
      const rows = {};
      [...box.children].filter(e => e.offsetParent !== null).forEach(e => { const b = e.getBoundingClientRect(); (rows[Math.round(b.top)] ||= []).push(b.width); });
      const holes = Object.values(rows).map(ws => W - ws.reduce((a, b) => a + b, 0) - gap * (ws.length - 1)).filter(h => h > 8);
      return { holes: holes.map(Math.round), wide: document.documentElement.scrollWidth - innerWidth };
    });
    if (r.none) bad(`главная ${width} px: блок «Пять минут» не найден`);
    else {
      if (r.holes.length) bad(`главная ${width} px: в «Пять минут» ряд не заполнен, пустота справа ${r.holes.join(', ')} px`);
      if (r.wide > 1) bad(`главная ${width} px: страница шире окна на ${r.wide} px`);
    }
    for (const e of [...new Set(errs)]) bad(`главная ${width} px: ошибка JS: ${e}`);
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `home-${width}.png`), fullPage: false });
    console.log(`  ${!r.none && !r.holes.length && r.wide <= 1 ? '✓' : '✗'} главная ${width} px`);
    await c.close();
  }
}

// 8. Порядок слов. 13.11.2026 Алина собрала «ich habe im Supermarkt Proviant eingekauft», а засчитали ошибку:
// повтор принимал один порядок, и заглавная «Im» на плашке подсказывала начало. Плюс кнопка «Оспорить».
{
  const { page, errs } = await open();
  const r = await page.evaluate(async () => {
    const out = [];
    const perf = { s: 'Im Supermarkt ___ ich Proviant ___.', aux: 'habe', p: 'eingekauft', ru: 'закупиться', i: 'einkaufen' };
    const b = toBuild(perf, 'perfekt');
    if (!b) return ['toBuild не собрал фразу из Perfekt'];
    const wir = toBuild({ s: 'Wir ___ jeden Tag ___.', aux: 'bin', p: 'gesegelt' }, 'perfekt');
    if (wir && wir.ok[0] !== 'Wir sind jeden Tag gesegelt') out.push('Perfekt → фраза: «' + wir.ok[0] + '» вместо «Wir sind jeden Tag gesegelt»');
    const yes = [['ich', 'habe', 'im', 'Supermarkt', 'Proviant', 'eingekauft'], ['Proviant', 'habe', 'ich', 'im', 'Supermarkt', 'eingekauft']];
    const no = [['im', 'habe', 'Supermarkt', 'ich', 'Proviant', 'eingekauft'], ['im', 'Supermarkt', 'habe', 'Proviant', 'ich', 'eingekauft'], ['ich', 'im', 'Supermarkt', 'habe', 'Proviant', 'eingekauft'], ['ich', 'habe', 'Supermarkt', 'im', 'Proviant', 'eingekauft']];
    yes.forEach(w => { if (!orderOk(w, b)) out.push('не принят верный порядок: ' + w.join(' ')) });
    no.forEach(w => { if (orderOk(w, b)) out.push('принят неверный порядок: ' + w.join(' ')) });
    if (owTile('Im', true) !== 'im' || owTile('Petya', true) !== 'Petya') out.push('первая плашка: заглавная буква не убрана или имя испорчено');
    // в интерфейсе: собрать её порядок
    const L = { id: 'smoke-order', title: 'Порядок слов', stages: [{ type: 'build', title: 'Порядок', color: 'coral', items: [{ ...b }, { ...b }] }] };
    S.lessons.push(L); showIntro(L); startRun();
    const wait = ms => new Promise(f => setTimeout(f, ms));
    const pass = async () => { for (let k = 0; k < 6 && !document.querySelector('.bank'); k++) { const d = document.getElementById('dbtn'); if (d) d.click(); await wait(200) } };
    await pass();
    const bankTxt = [...document.querySelectorAll('.bank .tile')].map(t => t.textContent);
    if (bankTxt.includes('Im')) out.push('на плашке осталась «Im» с большой буквы');
    const put = async words => { for (const w of words) { const t = [...document.querySelectorAll('.bank .tile:not(.ghost)')].find(x => x.textContent.toLowerCase() === w.toLowerCase()); if (!t) { out.push('нет плашки ' + w); return } t.click(); await wait(30) } document.getElementById('dbtn').click(); await wait(300) };
    await put(yes[0]);
    if (!document.getElementById('dock').classList.contains('ok')) out.push('её порядок «ich habe im Supermarkt Proviant eingekauft» засчитан ошибкой');
    document.getElementById('dbtn').click(); await wait(300); await pass();
    await put(no[0]);
    const dsp = document.getElementById('dsp');
    if (document.getElementById('dock').classList.contains('ok')) out.push('неверный порядок засчитан');
    else if (!dsp) out.push('нет ссылки «Спросить про ошибку» после ошибки');
    else {
      S.sample = { json: async () => ({ ok: true, why: 'Так тоже можно.', tip: '' }) };
      dsp.click(); await wait(200);
      const why = document.getElementById('dspwhy');
      if (!why) out.push('«Спросить про ошибку»: в чате нет вопроса «Почему не мой вариант?»');
      else { why.click(); await wait(400); }
      const msg = document.querySelector('#asklog .askm.ai');
      if (!msg || !/Ты права/.test(msg.textContent)) out.push('«Почему не мой вариант?»: в чате нет ответа преподавателя');
      document.getElementById('askx')?.click(); await wait(100);
      const d = document.getElementById('dock');
      if (!d.classList.contains('ok') || !/Засчитано/.test(d.textContent)) out.push('«Оспорить»: ответ не засчитан после согласия преподавателя');
      if (!(S.progress.disputes || []).length) out.push('«Оспорить»: спор не записан в progress.disputes');
      if (!orderOk(no[0], b)) out.push('«Оспорить»: засчитанный вариант не запомнился');
    }
    return out;
  }).catch(e => ['ошибка теста: ' + e]);
  r.forEach(x => bad('порядок слов: ' + x));
  for (const e of [...new Set(errs)]) bad(`порядок слов: ошибка JS: ${e}`);
  console.log(`  ${r.length ? '✗' : '✓'} порядок слов и «Почему не мой вариант?»`);
  await page.close();
}

// «Как сказать»: история без недописанного и опечаток, счётчик повторов не растёт от просмотра.
// Баг ноября 2026: в истории оставались «черепаха л» и «чееаха», нажатие на прошлый запрос считалось повтором.
{
  const { page, errs } = await open();
  const r = await page.evaluate(async () => {
    const out = [], wait = ms => new Promise(f => setTimeout(f, ms));
    if (typeof sayRun !== 'function' || typeof showDict !== 'function') return ['нет sayRun/showDict'];
    S.progress.ask = [];
    S.sample = { json: async () => ({ kind: 'word', de: 'die Schildkröte', ru: 'черепаха', ex: '' }) };
    const H = () => S.progress.ask.map(h => h.q + '×' + (h.n || 1));
    // словарь в уроке: пауза посреди набора запускает ответ сам, потом фраза дописана
    showDict(); await wait(300);
    const dq = document.getElementById('dq');
    if (!dq) return ['словарь в уроке не открылся'];
    const type = async t => { for (const ch of t) { dq.value += ch; dq.dispatchEvent(new Event('input', { bubbles: true })); await wait(40); } };
    await type('черепаха л'); await wait(2200);
    if (!S.progress.ask.some(h => h.q === 'черепаха л')) out.push('пауза в словаре урока не запустила ответ (тест устарел?)');
    await type('етит'); dq.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); await wait(400);
    if (S.progress.ask.some(h => h.q === 'черепаха л')) out.push('недописанный запрос «черепаха л» остался в истории: ' + H().join(', '));
    // опечатка, исправленная в чате
    showSay(); await wait(100);
    sayRun('чееаха'); await wait(200); sayRun('черепаха'); await wait(200);
    if (S.progress.ask.some(h => h.q === 'чееаха')) out.push('опечатка «чееаха» осталась в истории после исправления: ' + H().join(', '));
    // нажатие на прошлый запрос и повтор в том же разговоре — не повтор
    sayRun('черепаха', true); await wait(100); sayRun('черепаха'); await wait(100);
    const h = S.progress.ask.find(x => x.q === 'черепаха');
    if (!h) out.push('«черепаха» не попала в историю');
    else if ((h.n || 1) > 1) out.push('просмотр и повтор в том же разговоре засчитаны как повтор: ×' + h.n);
    // через час — уже повтор
    if (h) { h.t -= 2 * 3600e3; sayRun('черепаха'); await wait(100); if ((h.n || 1) !== 2) out.push('повтор через час не засчитан: ×' + h.n); }
    // ответ пришёл — «Думаю» сменяется ответом (в v126 параметр sayRun затенил глобальный view, и экран не перерисовывался)
    showSay(); S.sample = { json: async () => ({ kind: 'word', de: 'der Hund', ru: 'собака', ex: '' }) };
    sayRun('собака'); await wait(200);
    if (!/Hund/.test(document.querySelector('.slog')?.textContent || '')) out.push('ответ не появляется на экране, висит «Думаю»');
    // v127: вопросы о языке тоже в истории, формы глагола под словом, разговор остаётся после перезагрузки
    if (typeof sayLogSeed === 'function') {
      let calls = 0;
      S.sample = { json: async p => { calls++; return /kennen/.test(p)
        ? { kind: 'q', lead: 'kennen — люди, wissen — факты', items: [{ de: 'kennen', ru: 'знать', note: '', ex: [['Ich **kenne** ihn.', 'Я его знаю.']] }], check: '', tasks: [] }
        : { kind: 'word', de: 'gehen', ru: 'идти', f: 'ging · ist gegangen', ex: '' }; } };
      sayRun('прошедшее от gehen'); await wait(200);
      if (!/ging · ist gegangen/.test(document.querySelector('.slog')?.textContent || '')) out.push('у глагола не показаны прошедшие формы');
      sayRun('разница kennen и wissen'); await wait(200);
      if (!S.progress.ask.some(x => x.kind === 'q' && x.a)) out.push('вопрос о языке не сохранился в истории');
      if (askRepeats().some(x => x.kind === 'q')) out.push('вопрос о языке попал в повторы недели');
      SAYLOG.length = 0; sayLogSeed.done = false; showHome(); showSay(); await wait(100);
      if (!SAYLOG.some(x => /kennen/.test(x.q))) out.push('после перезагрузки разговор пустой');
      const c0 = calls; sayRun('разница kennen и wissen', true); await wait(150);
      if (calls !== c0) out.push('прошлый вопрос из истории спрашивается заново вместо сохранённого ответа');
    }
    return out;
  }).catch(e => ['ошибка теста: ' + e]);
  r.forEach(x => bad('«Как сказать»: ' + x));
  for (const e of [...new Set(errs)]) bad(`«Как сказать»: ошибка JS: ${e}`);
  console.log(`  ${r.length ? '✗' : '✓'} «Как сказать»: история и повторы`);
  await page.close();
}

await browser.close();
console.log(problems ? `\n${problems} проблем(ы)` : '\n✓ Автотест прошёл');
process.exit(problems ? 1 : 0);
