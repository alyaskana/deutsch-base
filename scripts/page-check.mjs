// Проверка кода артефакта перед публикацией (Mein Deutsch, Artikelregen).
// Запуск: npm run page-check -- путь/к/странице.html
// Ловит базовые ошибки: синтаксис, повторно объявленные функции и переменные
// (последняя молча перекрывает первую), поля ввода, которые перерисовывают экран
// на каждый символ без задержки.
import fs from 'node:fs';
import * as acorn from 'acorn';
import * as walk from 'acorn-walk';

const file = process.argv[2];
if (!file) { console.error('Укажи путь к HTML'); process.exit(2); }
const html = fs.readFileSync(file, 'utf8');
const scripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);
const src = scripts.join('\n;\n');
let problems = 0;
const bad = (msg) => { problems++; console.log('✗ ' + msg); };

let ast;
try { ast = acorn.parse(src, { ecmaVersion: 'latest', locations: true }); }
catch (e) { bad(`синтаксис: ${e.message}`); process.exit(1); }

// 1. Повторные объявления в одной области видимости (весь код страницы — одна глобальная область).
function dupes(body, where) {
  const seen = {};
  for (const st of body) {
    const names = st.type === 'FunctionDeclaration' || st.type === 'ClassDeclaration' ? [st.id.name]
      : st.type === 'VariableDeclaration' ? st.declarations.filter(d => d.id.type === 'Identifier').map(d => d.id.name) : [];
    for (const n of names) (seen[n] ??= []).push(st.loc.start.line);
  }
  for (const [n, lines] of Object.entries(seen)) if (lines.length > 1) bad(`${where}: «${n}» объявлено ${lines.length} раза (строки кода ${lines.join(', ')})`);
}
dupes(ast.body, 'глобально');
walk.full(ast, n => {
  if (/Function/.test(n.type) && n.body?.type === 'BlockStatement') dupes(n.body.body, `функция на строке ${n.loc.start.line}`);
});

// 2. oninput / addEventListener('input') без setTimeout, который перерисовывает innerHTML.
walk.full(ast, n => {
  let fn = null;
  if (n.type === 'AssignmentExpression' && n.left.type === 'MemberExpression' && n.left.property.name === 'oninput') fn = n.right;
  if (n.type === 'CallExpression' && n.callee.property?.name === 'addEventListener' && n.arguments[0]?.value === 'input') fn = n.arguments[1];
  if (!fn || !/Function/.test(fn.type)) return;
  const code = src.slice(fn.start, fn.end);
  if (/innerHTML|show[A-Z]\w*\(|list\(\)/.test(code) && !/setTimeout|requestAnimationFrame/.test(code))
    bad(`поле ввода на строке ${fn.loc.start.line} перерисовывает экран на каждый символ — нужна задержка (дебаунс)`);
});

console.log(problems ? `\nНайдено проблем: ${problems}` : '✓ Код страницы чистый');
process.exit(problems ? 1 : 0);
