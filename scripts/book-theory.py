#!/usr/bin/env python3
"""Теория раздела книги «Немецкий от А до Ja!» из epub в узлы для Mein Deutsch.

Запуск: python3 -I scripts/book-theory.py <папка OEBPS> <урок> <раздел> [файл-урока.json]
Пример: python3 -I scripts/book-theory.py /tmp/book/OEBPS 15 15.2 data/book/units/book-15-2.json

Текст берётся как в книге (Алина: «не стоит сильно отходить от книги»). Узлы:
  {k:'h',x} подзаголовок, {k:'p',x} абзац, {k:'tab',r} таблица, {k:'ex',r:[[de,ru]]} примеры,
  {k:'img',src,alt} рисунок (data:, рисунки маленькие), {k:'box',c,t,x[]} рамка книги:
  c = trap/rule/… внутри теории, loan/dach/false/en уходят в book.extra («Интересное из урока»).
Немецкое в тексте (span.de) — <b>, неверная форма — <s>.
"""
import base64, html, json, re, sys
from pathlib import Path

def inline(s):
    s = re.sub(r'<span class="audio">.*?</span>', '', s, flags=re.S)
    s = re.sub(r'<img[^>]*>', '', s)
    s = re.sub(r'<span class="(?:de|deb)"[^>]*>(.*?)</span>', r'<b>\1</b>', s, flags=re.S)
    s = re.sub(r'<s [^>]*>(.*?)</s>', r'<s>\1</s>', s, flags=re.S)
    s = re.sub(r'<span class="en"[^>]*>(.*?)</span>', r'<i>\1</i>', s, flags=re.S)
    s = re.sub(r'<(?!/?(?:b|i|s)>)[^>]+>', '', s)
    s = html.unescape(re.sub(r'\s+', ' ', s)).strip()
    return s.replace('</b> <b>', ' ').replace('</b><b>', '')

def table(t):
    rows = []
    for tr in re.findall(r'<tr[^>]*>(.*?)</tr>', t, re.S):
        rows.append([inline(c) for c in re.findall(r'<t[hd][^>]*>(.*?)</t[hd]>', tr, re.S)])
    return rows

def convert(oebps, lesson, sec):
    s = (Path(oebps) / 'text' / f'lesson-{lesson:02d}.xhtml').read_text()
    i = s.index(f'<h2 id="s-{lesson}-{sec.split(".")[1]}"')
    j = s.find('<h2', i + 5)
    body = s[s.index('</h2>', i) + 5: j if j > 0 else None]
    theory, extra = [], []
    pat = re.compile(r'<h3[^>]*>.*?</h3>|<p[^>]*>.*?</p>|<div class="table-wrap">.*?</div>|<div class="examples">.*?</div>|<figure.*?</figure>|<aside.*?</aside>', re.S)
    for m in pat.finditer(body):
        e = m.group(0)
        if e.startswith('<h3'): theory.append({'k': 'h', 'x': inline(e)})
        elif e.startswith('<p'): 
            x = inline(e)
            if x: theory.append({'k': 'p', 'x': x})
        elif 'table-wrap' in e[:30]: theory.append({'k': 'tab', 'r': table(e)})
        elif 'examples' in e[:30]:
            theory.append({'k': 'ex', 'r': [[inline(a), inline(b)] for a, b in re.findall(r'<span class="ex-de">(.*?)</span>\s*<span class="ex-ru">(.*?)</span></p>', e, re.S)]})
        elif e.startswith('<figure'):
            src = re.search(r'src="\.\./images/([^"]+)"', e).group(1)
            alt = html.unescape(re.search(r'alt="([^"]*)"', e).group(1))
            mime = 'image/png' if src.endswith('png') else 'image/jpeg'
            data = base64.b64encode((Path(oebps) / 'images' / src).read_bytes()).decode()
            theory.append({'k': 'img', 'src': f'data:{mime};base64,{data}', 'alt': alt})
        else:
            c = re.search(r'class="box box-([a-z]+)"', e).group(1)
            t = inline(re.search(r'<p class="box-title">(.*?)</p>', e, re.S).group(1)) if 'box-title' in e else ''
            inner = re.sub(r'<p class="box-title">.*?</p>', '', e, flags=re.S)
            x = [inline(p) for p in re.findall(r'<p[^>]*>(.*?)</p>', inner, re.S)]
            x = [p for p in x if p]
            node = {'k': 'box', 'c': c, 't': t, 'x': x}
            (extra if c in ('loan', 'dach', 'false', 'en') else theory).append(node)
    return theory, extra

if __name__ == '__main__':
    oebps, lesson, sec = sys.argv[1], int(sys.argv[2]), sys.argv[3]
    th, ex = convert(oebps, lesson, sec)
    if len(sys.argv) > 4:
        p = Path(sys.argv[4]); d = json.loads(p.read_text())
        b = d['book']; b.pop('theory', None); b['th'] = th
        if ex: b['extra'] = ex
        else: b.pop('extra', None)
        p.write_text(json.dumps(d, ensure_ascii=False, indent=1) + '\n')
    else:
        print(json.dumps({'th': th, 'extra': ex}, ensure_ascii=False, indent=1))
