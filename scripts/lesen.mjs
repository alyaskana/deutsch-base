// Собирает уроки чтения для «Mein Deutsch» из историй Lesezeit (data/lesen/stories.json)
// и авторских заданий к серии (data/lesen/episodes/NN-id.json).
// Запуск: node scripts/lesen.mjs  →  build/lesen/lesen-<id>.json (документ коллекции lessons).
// Формат и порядок выпуска: automation/lesen.md.
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => JSON.parse(readFileSync(join(root, p), "utf8"));
const stories = Object.fromEntries(read("data/lesen/stories.json").map((s) => [s.id, s]));

export const SERIAL = {
  id: "wmd",
  title: "Wie man Deutscher wird",
  ru: "Как стать немцем",
  sub: "Том из Испании переезжает в Берлин и знакомится с немецкими привычками.",
  total: 50,
};

// «{{+auf}}» — вторая часть разорванной единицы (отделяемая приставка, Perfekt):
// страница такой разметки не знает, поэтому даём ей ту же подсказку, что у первой части.
function joinSplit(p) {
  let last = "";
  return p.replace(/\{\{([^|}]+)(?:\|([^}]+))?\}\}/g, (m, w, g) => {
    if (g) { last = g; return m; }
    if (!w.startsWith("+")) throw new Error("разметка без перевода: " + m);
    if (!last) throw new Error("нет первой части для " + m);
    return `{{${w.slice(1)}|${last}}}`;
  });
}

const out = join(root, "build/lesen");
mkdirSync(out, { recursive: true });
const audio = read("data/lesen/audio.json");
const errors = [];
for (const f of readdirSync(join(root, "data/lesen/episodes")).filter((x) => x.endsWith(".json")).sort()) {
  const e = read("data/lesen/episodes/" + f);
  const s = stories[e.story];
  if (!s) { errors.push(`${f}: нет истории ${e.story}`); continue; }
  const paragraphs = s.paragraphs.map(joinSplit);
  if (e.tr.length !== paragraphs.length) errors.push(`${f}: переводов абзацев ${e.tr.length}, абзацев ${paragraphs.length}`);
  const plain = paragraphs.join(" ").replace(/\{\{([^|}]+)\|[^}]+\}\}/g, "$1");
  for (const q of e.questions) {
    if (q.o.filter((o) => o === q.a).length !== 1) errors.push(`${f}: вопрос «${q.q}»: верный ответ должен встречаться среди вариантов ровно один раз`);
  }
  for (const m of e.meaning) {
    if (m.o.filter((o) => o === m.a).length !== 1) errors.push(`${f}: слово «${m.w}»: верный ответ среди вариантов ровно один раз`);
    if (!/<b>/.test(m.s)) errors.push(`${f}: слово «${m.w}»: в примере не выделено слово`);
    if (!m.tr.includes("…")) errors.push(`${f}: слово «${m.w}»: в переводе нет пропуска «…»`);
  }
  for (const c of e.cloze) {
    if ((c.s.match(/___/g) || []).length !== 1) errors.push(`${f}: «${c.s}»: нужен ровно один пропуск`);
    const w = c.a.toLowerCase();
    if (!plain.toLowerCase().includes(w) && !e.meaning.some((m) => m.s.toLowerCase().includes(w))) errors.push(`${f}: «${c.a}» нет ни в истории, ни в новых словах`);
  }
  const au = audio["lesen-" + s.id];
  if (au && au.t.length !== paragraphs.length) errors.push(`${f}: в записи ${au.t.length} абзацев, в истории ${paragraphs.length}`);
  const doc = {
    title: s.title,
    topic: "Чтение · " + SERIAL.title,
    sub: e.sub,
    color: "teal",
    createdAt: e.released || new Date().toISOString().slice(0, 10),
    order: 20 + e.ep,
    serial: SERIAL,
    ep: e.ep,
    stages: [
      { type: "meaning", title: "Новые слова", sub: `${e.meaning.length} слов из истории`, color: "violet", shape: "circle", skill: "Слова из историй", items: e.meaning },
      { type: "read", title: s.title, sub: "Читаем историю", color: "teal", shape: "cloud", mins: 2, skill: "Чтение",
        text: { title: s.title, cap: e.cap, paragraphs, tr: e.tr, dict: s.dict || {} }, items: e.questions,
        ...(audio["lesen-" + s.id] ? { audio: audio["lesen-" + s.id] } : {}) },
      { type: "cloze", title: "Слово в контексте", sub: "Первая буква дана, остальное впиши", ask: "Допиши слово", color: "sun", shape: "flower", skill: "Слова из историй",
        items: e.cloze.map((c) => ({ ...c, tr: c.ru })) },
      { type: "write", title: "Про тебя", sub: e.write.sub, color: "pink", shape: "penta", items: [{ q: e.write.q, hint: e.write.hint, ph: e.write.ph, ex: e.write.ex, check: e.write.check }] },
    ],
  };
  writeFileSync(join(out, `lesen-${s.id}.json`), JSON.stringify(doc, null, 1));
  console.log(`lesen-${s.id}: серия ${e.ep}, ${JSON.stringify(doc).length} байт`);
}
if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
