// Собирает словарь для «Mein Deutsch» (раздел «Словарик», плитки тем как в Drops):
// слова с уроков (data/words.json + статусы из build/status.json) и общая лексика A1–A2 (data/catalog.txt).
// Запуск: node scripts/dict.mjs  →  build/dict.json
// Приложение читает его из своей базы: коллекция "lessons", документ "_dict" (объект из файла как есть; раньше — поле j строкой); копия встроена в страницу.
// Формат слова: [лемма, артикль, мн.ч., перевод, часть речи, темы, статус, пример, формы, откуда, уровень]
//   темы — буквы из TOPICS ("a".."n"); статус: "s" сложно, "l" было трудным, "" — нет;
//   откуда: "" — с уроков, "c" — общий список A1–A2; уровень: "A1" | "A2" | "".
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => JSON.parse(readFileSync(join(root, p), "utf8"));
const words = read("data/words.json");
const status = Object.fromEntries(read("build/status.json").words.map((w) => [w.id, w.status]));

// Темы-плитки: ключ, название, цвет, форма маскота, теги words.json, которые в неё входят.
export const TOPICS = [
  ["people", "Люди и семья", "#FF77B4", "flower", ["kennenlernen", "stimmung"]],
  ["home", "Дом и быт", "#16BFA6", "square", ["wohnen", "haushalt", "hausarbeit"]],
  ["food", "Еда", "#FFB21E", "circle", ["essen", "restaurant"]],
  ["shop", "Покупки и одежда", "#FF6B4A", "diamond", ["einkaufen", "kleidung", "farben"]],
  ["city", "Город и дорога", "#5B84F0", "penta", ["unterwegs", "transport", "ha-verkehrsmittel", "wegbeschreibung"]],
  ["work", "Работа и учёба", "#7444E6", "square", ["arbeit", "buero", "beruf", "email"]],
  ["health", "Здоровье и тело", "#E07A5F", "cloud", ["gesundheit", "gesundheit-klein", "koerper"]],
  ["free", "Свободное время", "#FF77B4", "circle", ["freizeit", "segeln"]],
  ["day", "Время и мой день", "#FFB21E", "flower", ["tagesablauf", "mein-tag", "dein-tag", "alltag"]],
  ["nature", "Природа и погода", "#16B37A", "cloud", ["wetter", "meer", "tiere"]],
  ["travel", "Путешествия и страны", "#5D7F95", "penta", ["laender", "sprachen"]],
  ["verbs", "Частые глаголы", "#5B84F0", "diamond", []],
  ["other", "Разное", "#A79FC4", "circle", []],
];
const L = "abcdefghijklmnopqrstuvwxyz";
const T = Object.fromEntries(TOPICS.map(([k], i) => [k, L[i]]));
const fold = (s) => String(s).toLowerCase().replace(/^(der|die|das)\s+/, "").replace(/ä/g, "a").replace(/ö/g, "o").replace(/ü/g, "u").replace(/ß/g, "ss").trim();

const forms = (w) => {
  const f = w.verb_forms;
  const out = [];
  if (f) {
    if (f.present_3sg) out.push("er " + f.present_3sg);
    if (f.partizip2) out.push((f.aux === "sein" ? "ist " : f.aux === "haben" ? "hat " : "") + f.partizip2);
  }
  const gov = [w.governs, w.with_prep].filter(Boolean).join(", ");
  if (gov) out.push(gov);
  return out.join(" · ");
};
const trim = (row) => { while (row.length && row[row.length - 1] === "") row.pop(); return row; };

// 1. Общий список A1–A2: тема берётся из заголовка, часть речи — по артиклю
const cat = new Map();
let cur = null;
for (const line of readFileSync(join(root, "data/catalog.txt"), "utf8").split("\n")) {
  const h = line.match(/^##\s+(\w+)\s/);
  if (h) { cur = h[1]; if (!T[cur]) throw new Error("catalog.txt: неизвестная тема " + cur); continue; }
  if (!line.trim() || line.startsWith("#")) continue;
  const [w, pl, ru, lvl, posx] = line.split("|").map((s) => s.trim());
  const m = w.match(/^(der|die|das)\s+(.+)$/);
  const k = fold(w);
  const e = cat.get(k);
  if (e) { if (!e.t.includes(T[cur])) e.t += T[cur]; continue; }
  // часть речи: по артиклю, пробелу и русскому переводу (инфинитив → глагол, -ый/-ий/-ой → прилагательное)
  const ru1 = ru.split(/[,;(]/)[0].trim().split(" ")[0];
  const pos = posx ? posx : m ? "noun" : /\s/.test(w.replace(/^sich /, "")) ? "phrase" : /(ть|ться|ти|чь|чься)$/.test(ru1) ? "verb" : /(ый|ий|ой|ён)$/.test(ru1) ? "adj" : "adv";
  cat.set(k, { lemma: m ? m[2] : w, art: m ? m[1] : "", pl: pl === "-" ? "" : pl || "", ru, pos, t: T[cur] + (pos === "verb" && cur !== "verbs" ? T.verbs : ""), lvl: lvl || "" });
}

// 2. Слова с уроков; если слово есть и в общем списке — берём его темы и уровень
const seen = new Set();
const d = words.map((w) => {
  const tags = new Set(w.tags || []);
  const k = fold((w.article ? w.article + " " : "") + w.lemma);
  seen.add(k);
  const c = cat.get(k);
  let t = TOPICS.map(([key, , , , ts], i) => (ts.some((x) => tags.has(x)) || (c && c.t.includes(L[i])) ? L[i] : "")).join("");
  if (w.pos === "verb" && !t.includes(T.verbs)) t += T.verbs;
  if (!t) t = T.other;
  const st = { stuck: "s", learning: "l" }[status[w.id]] || "";
  const ex = (w.examples || [])[0];
  return trim([w.lemma, w.article || "", w.plural && w.plural !== w.lemma ? w.plural : "", w.ru || "", w.pos || "", t, st, ex ? ex.de + (ex.ru ? " — " + ex.ru : "") : "", forms(w), "", c ? c.lvl : ""]);
});
let added = 0;
for (const [k, c] of cat) {
  if (seen.has(k)) continue;
  d.push(trim([c.lemma, c.art, c.pl, c.ru, c.pos, c.t, "", "", "", "c", c.lvl]));
  added++;
}

// 3. Словарь уроков книги «Немецкий от А до Ja!» (data/book/vocab/NN.json): своя тема-плитка на каждый урок.
//    Ключ темы — один символ вне a–z (U+0100 + номер урока), чтобы e.t.includes(k) не пересекался с обычными темами.
//    Слово, которое уже есть в словаре, получает тему урока; новое добавляется с откуда = "b".
const bookTopics = [];
const vdir = join(root, "data/book/vocab");
const rowKey = (r) => fold((r[1] ? r[1] + " " : "") + r[0]);
const byKey = new Map(d.map((r) => [rowKey(r), r]));
for (const f of (existsSync(vdir) ? readdirSync(vdir) : []).filter((x) => /^\d+\.json$/.test(x)).sort()) {
  const { l, words: bw } = JSON.parse(readFileSync(join(vdir, f), "utf8"));
  const tk = String.fromCodePoint(0x100 + l);
  bookTopics.push([tk, `Книга · урок ${l}`, "#7444E6", "square"]);
  const lvl = l <= 10 ? "A1" : l <= 20 ? "A2" : l <= 30 ? "B1" : "";
  for (const w of bw) {
    const k = fold(w.de);
    const r = byKey.get(k);
    if (r) {
      while (r.length < 6) r.push("");
      if (!r[5].includes(tk)) r[5] += tk;
      if (!r[3] && w.ru) r[3] = w.ru;
      if (!r[2] && /^die \S+$/.test(w.pl || "")) r[2] = w.pl.slice(4);
      continue;
    }
    const pl = /^die \S+$/.test(w.pl || "") && w.pl !== w.de ? w.pl.slice(4) : "";
    const fm = w.art ? "" : w.pos === "verb" && w.forms ? "er " + w.forms.replace(", ", " · ") : w.forms || "";
    const row = trim([w.lemma, w.art, pl, w.ru, w.pos || "", tk + (w.pos === "verb" ? T.verbs : ""), "", "", fm, "b", lvl]);
    d.push(row);
    byKey.set(k, row);
  }
}

const out = { v: 2, at: new Date().toISOString().slice(0, 16) + "Z", topics: TOPICS.map(([k, n, color, shape]) => [L[TOPICS.findIndex((x) => x[0] === k)], n, color, shape]).concat(bookTopics), d };
writeFileSync(join(root, "build/dict.json"), JSON.stringify(out));
const fromBook = d.filter((r) => r[9] === "b").length;
console.log(`build/dict.json: ${d.length} слов (${d.length - added - fromBook} с уроков, ${added} из общего списка A1–A2, ${fromBook} из книги), ${Math.round(JSON.stringify(out).length / 1024)} КБ`);
