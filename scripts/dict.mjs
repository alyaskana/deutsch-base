// Собирает компактный словарь для «Mein Deutsch» из data/words.json и build/status.json.
// Запуск: node scripts/dict.mjs  →  build/dict.json
// Приложение читает его из своей базы: коллекция "lessons", документ "_dict" (поле d).
// Формат слова: [лемма, артикль, мн.ч., перевод, часть речи, темы, статус, пример, формы]
//   темы — строка из индексов TOPICS (символы "a".."z"), статус: "s" затык, "l" изучаю, "" новое.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => JSON.parse(readFileSync(join(root, p), "utf8"));
const words = read("data/words.json");
const status = Object.fromEntries(read("build/status.json").words.map((w) => [w.id, w.status]));

// Темы для фильтра: название по-русски и теги words.json, которые в неё входят.
export const TOPICS = [
  ["Дом и быт", ["wohnen", "haushalt", "hausarbeit"]],
  ["Работа", ["arbeit", "buero", "beruf", "email"]],
  ["Здоровье и тело", ["gesundheit", "gesundheit-klein", "koerper"]],
  ["Еда", ["essen", "restaurant"]],
  ["Покупки и одежда", ["einkaufen", "kleidung", "farben"]],
  ["Город и дорога", ["unterwegs", "transport", "ha-verkehrsmittel", "wegbeschreibung"]],
  ["Свободное время", ["freizeit", "segeln", "meer", "tiere", "stimmung"]],
  ["Мой день", ["tagesablauf", "mein-tag", "dein-tag", "alltag", "wetter", "kennenlernen"]],
  ["Страны и языки", ["laender", "sprachen"]],
];
const L = "abcdefghijklmnopqrstuvwxyz";

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

const d = words.map((w) => {
  const tags = new Set(w.tags || []);
  const t = TOPICS.map(([, ts], i) => (ts.some((x) => tags.has(x)) ? L[i] : "")).join("");
  const st = { stuck: "s", learning: "l" }[status[w.id]] || "";
  const ex = (w.examples || [])[0];
  const row = [w.lemma, w.article || "", w.plural && w.plural !== w.lemma ? w.plural : "", w.ru || "", w.pos || "", t, st, ex ? ex.de + (ex.ru ? " — " + ex.ru : "") : "", forms(w)];
  while (row.length && row[row.length - 1] === "") row.pop();
  return row;
});

const out = { v: 1, at: new Date().toISOString().slice(0, 10), topics: TOPICS.map(([n]) => n), d };
writeFileSync(join(root, "build/dict.json"), JSON.stringify(out));
console.log(`build/dict.json: ${d.length} слов, ${Math.round(JSON.stringify(out).length / 1024)} КБ`);
