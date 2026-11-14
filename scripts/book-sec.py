#!/usr/bin/env python3
"""Свои короткие задания к разделам книги: data/book/sec/NN.json → stages в units/book-NN-M.json.

  python3 -I scripts/book-sec.py <урок> [<урок>...]

sec/NN.json: {"N.M": [этап, …]} — этапы в формате Mein Deutsch (choice / type / build).
Задания по примерам и правилам раздела; цвет и форма проставляются здесь. Разделы с ручной разметкой (6.7, 15.2) не трогаются,
если в sec их нет."""
import json, sys
from pathlib import Path

root = Path(__file__).resolve().parent.parent
COL = ['coral', 'blue', 'teal', 'sun', 'violet', 'pink']; SH = ['circle', 'cloud', 'diamond', 'penta', 'square', 'flower']

for n in map(int, sys.argv[1:]):
    src = root / 'data/book/sec' / f'{n:02d}.json'
    if not src.exists():
        continue
    for s, stages in json.loads(src.read_text()).items():
        p = root / 'data/book/units' / f'book-{n:02d}-{s.split(".")[1]}.json'
        d = json.loads(p.read_text())
        for i, st in enumerate(stages):
            st.setdefault('color', COL[i % 6]); st.setdefault('shape', SH[i % 6])
        d['stages'] = stages
        d['sub'] = d.get('sub') or 'Теория по книге и короткие задания по разделу.'
        p.write_text(json.dumps(d, ensure_ascii=False, indent=1) + '\n')
        print(s, len(stages), 'этапа', sum(len(x['items']) for x in stages), 'заданий')
