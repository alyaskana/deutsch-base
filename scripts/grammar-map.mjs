// Собирает карту грамматики A1–A2 для раздела «Грамматика» в «Mein Deutsch».
// Запуск: node scripts/grammar-map.mjs (после scripts/status.mjs).
// Пишет build/grammar-map.json. Его содержимое кладётся в Mein Deutsch:
// коллекция "lessons", документ "_grammar", поле "j" (строка JSON), поле "at".
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => JSON.parse(readFileSync(join(root, p), "utf8"));
const grammar = read("data/grammar.json");
const modules = read("data/modules.json");
const lessons = read("data/lessons.json");
const status = read("build/status.json");
const mdg = read("data/mein-deutsch-grammar.json");
// Связь с книгой «От А до Ja» (14.11.2026): разделы книги по теме и оставленные конспекты с репетитором.
const bookLink = read("data/book/grammar-link.json").link;
const tutorNotes = read("data/book/tutor-notes.json").notes;

// Разделы таблицы: несколько категорий схемы сводятся в одну строку.
const CATS = [
  { k: "verbs", n: "Глаголы и времена", of: ["verbs", "tenses"] },
  { k: "cases", n: "Падежи и артикли", of: ["cases", "articles"] },
  { k: "pron", n: "Местоимения", of: ["pronouns"] },
  { k: "prep", n: "Предлоги", of: ["prepositions"] },
  { k: "adj", n: "Прилагательные", of: ["adjectives"] },
  { k: "sent", n: "Предложение и союзы", of: ["word-order", "conjunctions"] },
  { k: "more", n: "Числа и другое", of: ["numbers-time", "other"] },
];
const catOf = (c) => CATS.find((x) => x.of.includes(c)).k;
const byId = new Map(grammar.map((g) => [g.id, g]));
const st = new Map(status.grammar.map((s) => [s.id, s]));
const top = (id) => { let g = byId.get(id); while (g?.parent) g = byId.get(g.parent); return g?.id; };
const kids = (id) => grammar.filter((g) => top(g.id) === id && g.id !== id);

// Статус темы вместе с подтемами: «сложно» важнее всего, «впереди» — только если тему не начинали.
function agg(id) {
  const own = st.get(id);
  const all = [own, ...kids(id).map((k) => st.get(k.id))].filter(Boolean);
  const S = new Set(all.map((s) => s.status));
  const neg = all.reduce((n, s) => n + (s.counts?.error ?? 0) + (s.counts?.struggle ?? 0), 0);
  if (own?.status === "planned" && all.length === 1) return { st: "planned", neg: 0 };
  const stuck = all.filter((s) => s.status === "stuck");
  if (stuck.length) return { st: "stuck", why: stuck[0].reason, neg };
  if (S.has("learning")) return { st: "learning", neg };
  if (all.every((s) => s.status === "solid")) return { st: "solid", neg };
  if (S.has("solid")) return { st: "learning", neg };
  return { st: "new", neg };
}

const modDate = {};
for (const l of [...lessons].sort((a, b) => a.date.localeCompare(b.date)))
  for (const m of l.modules ?? []) modDate[m] ??= l.date;

const stagesFor = (id) => Object.entries(mdg.stages).filter(([, v]) => v.some((t) => top(t) === id)).map(([k]) => k);
const tops = grammar.filter((g) => !g.parent);
const lvOrder = { A1: 0, A2: 1, B1: 2 };
const catIdx = (g) => CATS.findIndex((c) => c.k === catOf(g.category));
const topics = tops
  .map((g, i) => ({ g, i }))
  .sort((a, b) => lvOrder[a.g.level] - lvOrder[b.g.level] || catIdx(a.g) - catIdx(b.g) || a.i - b.i)
  .map(({ g }) => {
    const a = agg(g.id);
    const mods = modules.filter((m) => (m.grammar ?? []).some((t) => top(t) === g.id) || (g.sources ?? []).some((s) => s.module === m.id) || kids(g.id).some((k) => (k.sources ?? []).some((s) => s.module === m.id))).map((m) => m.id);
    return {
      id: g.id, lv: g.level, cat: catOf(g.category), ru: g.title_ru, de: g.title_de, sh: g.short ?? g.title_de,
      st: a.st, ...(a.why ? { why: a.why } : {}), neg: a.neg, tut: g.covered_with_tutor ?? true,
      rule: g.rule_ru ?? "", ex: (g.examples ?? []).map((e) => [e.de, e.ru]),
      kids: kids(g.id).map((k) => ({ ru: k.title_ru, rule: k.rule_ru ?? "", st: st.get(k.id)?.status ?? "new" })),
      rel: [...new Set((g.related ?? []).map(top).filter((r) => r && r !== g.id))],
      mods, stg: stagesFor(g.id),
      bk: bookLink[g.id] ?? [], ...(tutorNotes[g.id] ? { kon: tutorNotes[g.id] } : {}),
    };
  });

const out = {
  v: 1,
  at: status.generated_for,
  cats: CATS.map(({ k, n }) => ({ k, n })),
  t: topics,
  m: [...modules].sort((a, b) => a.order - b.order).map((m) => ({
    id: m.id, t: m.title, lv: m.level, o: m.order, p: m.progress, ...(modDate[m.id] ? { d: modDate[m.id] } : {}),
    g: [...new Set((m.grammar ?? []).map(top))],
  })),
};
mkdirSync(join(root, "build"), { recursive: true });
writeFileSync(join(root, "build/grammar-map.json"), JSON.stringify(out) + "\n");
const count = (s) => topics.filter((t) => t.st === s).length;
console.log(`grammar-map: ${topics.length} тем (A1 ${topics.filter((t) => t.lv === "A1").length}, A2 ${topics.filter((t) => t.lv === "A2").length}); сложно ${count("stuck")}, изучаю ${count("learning")}, не проверено ${count("new")}, впереди ${count("planned")}`);
