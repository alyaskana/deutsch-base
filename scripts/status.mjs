// Вычисляет статусы тем и слов из data/observations.jsonl.
// Запуск: node scripts/status.mjs [--today YYYY-MM-DD]
// Пишет build/status.json (для кода и моделей) и STATUS.md (для чтения).
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => JSON.parse(readFileSync(join(root, p), "utf8"));
const rules = read("schema/status-rules.json");
const grammar = read("data/grammar.json");
const words = read("data/words.json");
const observations = readFileSync(join(root, "data/observations.jsonl"), "utf8")
  .split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l));

const argToday = process.argv.indexOf("--today");
const today = argToday > 0 ? process.argv[argToday + 1] : new Date().toISOString().slice(0, 10);
const DAY = 86400000;
const daysBetween = (a, b) => (Date.parse(b) - Date.parse(a)) / DAY;

// Наблюдения без даты считаются самыми старыми.
const byDate = (a, b) => (a.date ?? "0000-00-00").localeCompare(b.date ?? "0000-00-00");

const isNegative = (o) => o.result === "error" || o.result === "struggle";

export function computeStatus(obs, now = today, r = rules) {
  if (obs.length === 0) return { status: "new" };
  const sorted = [...obs].sort(byDate);
  const inWindow = sorted.filter((o) => o.date && daysBetween(o.date, now) <= r.window_days);
  const recentNegatives = inWindow.filter(isNegative).length;

  // Верные ответы засчитываются после отметки репетитора, только если у них есть дата позже отметки
  // (наблюдения без даты относятся к старому материалу и не «снимают» отметку).
  const lastFlag = [...sorted].reverse().find((o) => o.result === "flagged");
  const correctAfterFlag = lastFlag
    ? sorted.filter((o) => o.result === "correct" && o.date && (!lastFlag.date || o.date > lastFlag.date)).length
    : Infinity;

  const counts = {
    correct: sorted.filter((o) => o.result === "correct").length,
    error: sorted.filter((o) => o.result === "error").length,
    struggle: sorted.filter((o) => o.result === "struggle").length,
    flagged: sorted.filter((o) => o.result === "flagged").length,
  };
  const last = sorted.at(-1);
  const base = { counts, last_date: [...sorted].reverse().find((o) => o.date)?.date ?? null, last_result: last.result };

  if (recentNegatives >= r.stuck.min_errors_in_window || correctAfterFlag < r.stuck.correct_needed_after_flag) {
    const reason = recentNegatives >= r.stuck.min_errors_in_window
      ? `${recentNegatives} ошибок/затруднений за ${r.window_days} дн.`
      : `отмечено репетитором, после этого верных: ${correctAfterFlag} из ${r.stuck.correct_needed_after_flag}`;
    return { status: "stuck", reason, ...base };
  }

  const tail = sorted.slice(-r.solid.last_n_correct);
  const solid = tail.length === r.solid.last_n_correct
    && tail.every((o) => o.result === "correct" && o.date)
    && daysBetween(tail[0].date, tail.at(-1).date) >= r.solid.min_span_days
    && recentNegatives === 0;
  if (solid) return { status: "solid", ...base };

  return { status: "learning", ...base };
}

const group = (type) => {
  const m = new Map();
  for (const o of observations) if (o.target.type === type) {
    if (!m.has(o.target.id)) m.set(o.target.id, []);
    m.get(o.target.id).push(o);
  }
  return m;
};
const gObs = group("grammar");
const wObs = group("word");

const grammarStatus = grammar.map((g) => ({ id: g.id, title_ru: g.title_ru, level: g.level, covered_with_tutor: g.covered_with_tutor ?? true, ...computeStatus(gObs.get(g.id) ?? []) }));
const wordStatus = words.map((w) => ({ id: w.id, lemma: w.article ? `${w.article} ${w.lemma}` : w.lemma, ru: w.ru, ...computeStatus(wObs.get(w.id) ?? []) }));

const unknown = observations.filter((o) => !(o.target.type === "grammar" ? grammar : words).some((x) => x.id === o.target.id));
if (unknown.length) { console.error("Наблюдения ссылаются на несуществующие id:", unknown.map((o) => o.id)); process.exitCode = 1; }

const summary = (list) => Object.fromEntries(["stuck", "learning", "solid", "new"].map((s) => [s, list.filter((x) => x.status === s).length]));
const out = { generated_for: today, rules, summary: { grammar: summary(grammarStatus), words: summary(wordStatus) }, grammar: grammarStatus, words: wordStatus };
mkdirSync(join(root, "build"), { recursive: true });
writeFileSync(join(root, "build/status.json"), JSON.stringify(out, null, 2) + "\n");

// STATUS.md
const label = { stuck: "Затык", learning: "Изучаю", solid: "Уверенно", new: "Не проверено" };
const lines = [`# Статус на ${today}`, "", "Файл генерируется `node scripts/status.mjs`, руками не править.", ""];
lines.push("## Грамматика", "");
for (const s of ["stuck", "learning", "solid", "new"]) {
  const list = grammarStatus.filter((g) => g.status === s);
  if (!list.length) continue;
  lines.push(`### ${label[s]} (${list.length})`, "");
  for (const g of list) lines.push(`- **${g.title_ru}** \`${g.id}\`${g.reason ? ` — ${g.reason}` : ""}${g.covered_with_tutor ? "" : " · самостоятельно"}`);
  lines.push("");
}
const stuckWords = wordStatus.filter((w) => w.status === "stuck");
const learningWords = wordStatus.filter((w) => w.status === "learning");
lines.push("## Слова", "", `Всего ${wordStatus.length}: затык ${stuckWords.length}, изучаю ${learningWords.length}, уверенно ${wordStatus.filter((w) => w.status === "solid").length}, не проверено ${wordStatus.filter((w) => w.status === "new").length}.`, "");
if (stuckWords.length) { lines.push("### Затык", ""); for (const w of stuckWords) lines.push(`- ${w.lemma} — ${w.ru}`); lines.push(""); }
if (learningWords.length) { lines.push(`### Изучаю (${learningWords.length})`, "", learningWords.map((w) => w.lemma).join(", "), ""); }
writeFileSync(join(root, "STATUS.md"), lines.join("\n"));
console.log(JSON.stringify(out.summary));
