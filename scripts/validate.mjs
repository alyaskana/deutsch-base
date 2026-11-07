// Проверяет data/* по схемам и целостность ссылок между сущностями.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => JSON.parse(readFileSync(join(root, p), "utf8"));
const ajv = new Ajv2020({ allErrors: true });
addFormats(ajv);
ajv.addSchema(read("schema/common.schema.json"));

const errors = [];
const compiled = {};
const check = (schemaFile, data, label) => {
  const validate = (compiled[schemaFile] ??= ajv.compile(read(`schema/${schemaFile}`)));
  if (!validate(data)) errors.push(`${label}: ${ajv.errorsText(validate.errors, { separator: "\n  " })}`);
};

const data = {
  grammar: read("data/grammar.json"),
  words: read("data/words.json"),
  modules: read("data/modules.json"),
  lessons: read("data/lessons.json"),
  tasks: read("data/tasks.json"),
  "verb-lists": read("data/verb-lists.json"),
};
const observations = readFileSync(join(root, "data/observations.jsonl"), "utf8")
  .split("\n").filter((l) => l.trim()).map((l, i) => ({ line: i + 1, o: JSON.parse(l) }));

for (const k of Object.keys(data)) check(`${k}.schema.json`, data[k], `data/${k}.json`);
for (const { line, o } of observations) check("observation.schema.json", o, `observations.jsonl:${line}`);

const ids = Object.fromEntries(Object.entries(data).map(([k, v]) => [k, new Set(v.map((x) => x.id))]));
for (const [k, v] of Object.entries(data)) {
  const seen = new Set();
  for (const x of v) { if (seen.has(x.id)) errors.push(`${k}: дубль id ${x.id}`); seen.add(x.id); }
}
const ref = (set, id, where) => { if (id && !ids[set].has(id)) errors.push(`${where}: нет ${set}.${id}`); };
for (const g of data.grammar) { ref("grammar", g.parent, `grammar ${g.id}.parent`); (g.related ?? []).forEach((r) => ref("grammar", r, `grammar ${g.id}.related`)); (g.sources ?? []).forEach((s) => ref("modules", s.module, `grammar ${g.id}`)); }
for (const w of data.words) { (w.grammar ?? []).forEach((r) => ref("grammar", r, `word ${w.id}`)); (w.sources ?? []).forEach((s) => ref("modules", s.module, `word ${w.id}`)); }
for (const m of data.modules) (m.grammar ?? []).forEach((r) => ref("grammar", r, `module ${m.id}`));
for (const t of data.tasks) { ref("modules", t.module, `task ${t.id}`); (t.grammar ?? []).forEach((r) => ref("grammar", r, `task ${t.id}`)); }
for (const l of data.lessons) { (l.modules ?? []).forEach((r) => ref("modules", r, `lesson ${l.id}`)); (l.grammar ?? []).forEach((r) => ref("grammar", r, `lesson ${l.id}`)); (l.words ?? []).forEach((r) => ref("words", r, `lesson ${l.id}`)); (l.tasks_assigned ?? []).forEach((r) => ref("tasks", r, `lesson ${l.id}`)); }
for (const v of data["verb-lists"]) {
  const all = [...v.words, ...(v.groups ?? []).flatMap((g) => g.words), ...(v.trainer_lessons ?? []).flatMap((t) => t.words)];
  all.forEach((r) => ref("words", r, `verb-list ${v.id}`));
  for (const r of all) { const w = data.words.find((x) => x.id === r); if (w && !(w.verb_forms?.praeteritum && w.verb_forms?.partizip2 && w.verb_forms?.aux)) errors.push(`verb-list ${v.id}: у ${r} нет трёх форм`); }
}
const oSeen = new Set();
for (const { line, o } of observations) {
  if (oSeen.has(o.id)) errors.push(`observations: дубль id ${o.id}`); oSeen.add(o.id);
  ref(o.target.type === "grammar" ? "grammar" : "words", o.target.id, `observations:${line}`);
  ref("tasks", o.task, `observations:${line}.task`);
  ref("modules", o.module, `observations:${line}.module`);
}

if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
console.log(`OK: ${data.grammar.length} тем, ${data.words.length} слов, ${data.tasks.length} заданий, ${data.lessons.length} уроков, ${observations.length} наблюдений`);
