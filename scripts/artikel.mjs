// Собирает раздел «Род слова» и тренировку артиклей для «Mein Deutsch» (бывший Artikelregen).
// Источник один — эта база:
//   data/artikel/rules.json — 43 правила (окончание/группа, род, regex или список, lead, разделы der/die/das, ex, ex1 — пример для ячейки и карточки);
//   data/artikel/words.json — слова тренировки {w,g,ru,t,lvl,hard} (990 из Artikelregen + слова из текстов);
//   data/artikel/hints.json — 693 подсказки «почему такой род».
// Существительные с уроков (data/words.json), которых нет в words.json, добавляются при сборке с темой «Уроки».
// Запуск: node scripts/artikel.mjs  →  build/artikel.json
// Приложение читает его из своей базы: коллекция "lessons", документ "_artikel" (поле j — JSON строкой); копия встроена в страницу.
// Формат: {v, at (хэш содержимого: приложение берёт копию из базы, только если он другой), R:[правила], W:[[слово, g(r|e|s), перевод, тема, уровень, сложное 0/1]], H:{слово: подсказка}}
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => JSON.parse(readFileSync(join(root, p), "utf8"));
const rules = read("data/artikel/rules.json");
const words = read("data/artikel/words.json");
const hints = read("data/artikel/hints.json");
const lesson = read("data/words.json");

const err = [];
const G = { der: "r", die: "e", das: "s" };

// Правила: ничего не теряем — проверяем каждое поле
if (rules.length < 43) err.push(`правил ${rules.length}, ожидалось не меньше 43`);
const keys = new Set();
for (const r of rules) {
  const id = `${r.g} ${r.end}`;
  if (!G[r.g]) err.push(`${id}: род ${r.g}`);
  if (keys.has(id)) err.push(`${id}: правило повторяется`);
  keys.add(id);
  if (!r.re && !Array.isArray(r.list)) err.push(`${id}: нет ни regex, ни списка`); // «Языки», «Цвета» — список пустой, слова только в разделах
  if (r.re) try { new RegExp(r.re); } catch (e) { err.push(`${id}: regex ${e.message}`); }
  if (!r.lead) err.push(`${id}: нет lead`);
  if (!r.sec || !["der", "die", "das"].some((g) => r.sec[g])) err.push(`${id}: нет разделов sec`);
  if (!Array.isArray(r.ex) || !r.ex.length) err.push(`${id}: нет примеров ex`);
  const x = r.ex1;
  if (!x || !x.emoji || !x.w || !x.ru) err.push(`${id}: нет примера ex1 (эмодзи, слово, перевод)`);
  else if (x.hl && !x.hl.startsWith("^") && !x.w.endsWith(x.hl)) err.push(`${id}: ex1.hl «${x.hl}» не окончание ${x.w}`);
  else if (x.hl && x.hl.startsWith("^") && !x.w.startsWith(x.hl.slice(1))) err.push(`${id}: ex1.hl «${x.hl}» не начало ${x.w}`);
}

// Слова
const seen = new Map();
for (const x of words) {
  if (!x.w || !G[x.g] || !x.ru) err.push(`слово ${JSON.stringify(x)}: нет слова, рода или перевода`);
  if (seen.has(x.w)) err.push(`слово ${x.w} повторяется`);
  seen.set(x.w, x);
}
if (words.length < 1005) err.push(`слов ${words.length}, ожидалось не меньше 1005`);

// Подсказки
const nh = Object.keys(hints).length;
if (nh < 693) err.push(`подсказок ${nh}, ожидалось не меньше 693`);
for (const k of Object.keys(hints)) if (!seen.has(k)) err.push(`подсказка к слову ${k}, которого нет в words.json`);

// Существительные с уроков
let added = 0;
const W = words.map((x) => [x.w, G[x.g], x.ru, x.t || "", x.lvl || "", x.hard ? 1 : 0]);
for (const l of lesson) {
  if (l.pos !== "noun" || !G[l.article]) continue;
  const w = l.lemma.replace(/^(der|die|das)\s+/, "").trim();
  if (!w || seen.has(w) || w === w.toUpperCase() || /\s/.test(w)) continue;
  seen.set(w, l);
  W.push([w, G[l.article], l.ru, "Уроки", "", 0]);
  added++;
}

if (err.length) {
  console.error("artikel: ошибки\n  " + err.join("\n  "));
  process.exit(1);
}
const at = createHash("sha1").update(JSON.stringify([rules, W, hints])).digest("hex").slice(0, 10);
const out = { v: 1, at, R: rules, W, H: hints };
writeFileSync(join(root, "build/artikel.json"), JSON.stringify(out) + "\n");
console.log(`artikel: ${rules.length} правил, ${W.length} слов (${words.length} + ${added} с уроков), ${nh} подсказок → build/artikel.json`);
