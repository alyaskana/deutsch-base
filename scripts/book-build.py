#!/usr/bin/env python3
"""Разделы книги «Немецкий от А до Ja!» в units: теория из epub, без ручной разметки.

  python3 -I scripts/book-build.py <OEBPS> <урок> [<урок>...]

Для каждого раздела N.M пишет data/book/units/book-NN-M.json, если его ещё нет
(готовые разделы с ручной разметкой и заданиями не трогает):
  {title, topic, sub, order, createdAt, book:{l, s, th, extra?, lsum?}, stages: []}
stages пустые — раздел только с теорией; свои задания добавляются позже.
lsum — «Коротко о главном» всего урока из книги, кладётся в первый раздел (показывается на экране урока)."""
import html, json, re, sys, importlib.util
from datetime import date
from pathlib import Path

root = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location('bt', root / 'scripts' / 'book-theory.py')
bt = importlib.util.module_from_spec(spec); spec.loader.exec_module(bt)
S = json.loads((root / 'data/book/structure.json').read_text())


def lesson_sum(oebps, n):
    t = (Path(oebps) / 'text' / f'lesson-{n:02d}.xhtml').read_text()
    m = re.search(r'<h2[^>]*>Коротко о главном</h2>(.*?)(?:<section|<h2)', t, re.S)
    if not m:
        return []
    return [bt.inline(x) for x in re.findall(r'<li>(.*?)</li>', m.group(1), re.S)]


def main(oebps, ns):
    for n in map(int, ns):
        L = S['lessons'][n - 1]
        made = 0
        for k, sec in enumerate(L['sec']):
            m = sec['s'].split('.')[1]
            p = root / 'data/book/units' / f'book-{n:02d}-{m}.json'
            if p.exists():
                d = json.loads(p.read_text())
            else:
                bt.IMG_LIMIT = 70_000
                th, ex = bt.convert(oebps, n, sec['s'])
                imgs = sum(1 for x in th if x['k'] == 'img')
                if imgs and len(json.dumps(th + ex, ensure_ascii=False)) > 200_000:  # документ базы ≤ 256 КБ
                    bt.IMG_LIMIT = 110_000 // imgs
                    th, ex = bt.convert(oebps, n, sec['s'])
                d = {'title': sec['t'], 'topic': f'Книга · {sec["s"]}', 'sub': '', 'order': 0,
                     'createdAt': date.today().isoformat(), 'book': {'l': n, 's': sec['s'], 'th': th}, 'stages': []}
                if ex:
                    d['book']['extra'] = ex
                made += 1
            if k == 0:
                d['book']['lsum'] = lesson_sum(oebps, n)
            p.write_text(json.dumps(d, ensure_ascii=False, indent=1) + '\n')
        print(n, L['t'], 'разделов', len(L['sec']), 'новых', made)


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2:])
