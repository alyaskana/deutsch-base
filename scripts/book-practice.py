#!/usr/bin/env python3
"""Практика урока и «Проверь себя» из epub «Немецкий от А до Ja!» в уроки Mein Deutsch.

Запуск: python3 -I scripts/book-practice.py <папка OEBPS> <урок> <папка units>
Пишет book-NN-P.json (упражнения NN.1…) и book-NN-C.json («Проверь себя»).
Ответы и объяснения — из ключа книги (key.xhtml). Форматы:
  варианты a) b) c) → choice; пропуск → type (все варианты ключа через « / »);
  перевод без пропуска → build из слов ответа ключа; записка/сочинение → write (Claude проверяет, образец из ключа).
Упражнения с аудио пропускаются: аудио в epub нет.
"""
import html, json, re, sys
from pathlib import Path

def txt(s):
    s = re.sub(r'<br\s*/?>', ' ', s)
    s = re.sub(r'<span class="(?:de|deb)"[^>]*>(.*?)</span>', r'<b>\1</b>', s, flags=re.S)
    s = re.sub(r'<span class="blank">.*?</span>', '___', s, flags=re.S)
    s = re.sub(r'<(?!/?b>)[^>]+>', '', s)
    s = html.unescape(re.sub(r'\s+', ' ', s)).strip()
    return s.replace('</b><b>', '').replace('</b> <b>', ' ')
plain = lambda s: re.sub(r'<[^>]+>', '', s).strip()

def key_for(k, lesson, ex):
    i = k.find(f'id="k-{lesson:02d}-{ex}"')
    seg = k[i: k.find('id="k-', i + 10)]
    ans, expl = {}, {}
    ma = re.search(r'<p class="key-ans">(.*?)</p>', seg, re.S)
    if ma:
        for part in re.split(r'\s·\s', ma.group(1)):
            mm = re.match(r'\s*(\d+)(?:\xa0|\s)+(.*)', part, re.S)
            if mm: ans[int(mm.group(1))] = txt(mm.group(2))
    for li in re.findall(r'<li>(.*?)</li>', (re.search(r'<ul class="key-expl">(.*?)</ul>', seg, re.S) or [None, ''])[1] if re.search(r'<ul class="key-expl">', seg) else '', re.S):
        mm = re.match(r'<b>(\d+)\.</b>\s*(.*)', li, re.S)
        if mm: expl[int(mm.group(1))] = txt(mm.group(2))
    return ans, expl

def variants(a):
    a = re.split(r'\s+Верны и другие варианты', a)[0]
    extra = re.findall(r'например <b>(.*?)</b>', a)
    return [plain(v).strip(' .') for v in a.split(' / ')] + [plain(e).strip(' .') for e in extra]

def item_stage(li, n, ans, expl, rubric):
    a, e = ans.get(n, ''), expl.get(n, '')
    body = li
    opts = re.search(r'<br\s*/?>\s*a\)(.*)$', body, re.S)
    if opts:
        q = txt(body[:opts.start()])
        o = [plain(txt(x)).strip() for x in re.split(r'\s[b-d]\)', ' ' + opts.group(1).strip())]
        o = [x if x not in ('«–»', '-') else '«–»' for x in o]
        letter = plain(a).strip()[:1]
        idx = 'abcd'.index(letter)
        ru, s = (q.split(': ', 1) + [''])[:2] if ': ' in q else ('', q)
        return 'choice', {'s': plain(s or q), 'ru': plain(ru), 'o': o, 'a': o[idx], 'n': e}
    t = txt(body)
    if '___' in t:
        hint = ''
        mh = re.search(r'\(\s*<b>([^<]+)</b>\s*\)\s*$', t)
        if mh: hint, t = mh.group(1), t[:mh.start()].strip()
        if ': <b>' in t and not re.search(r'(Пауль|Алина|Ева|Йонас)[^:]*:', t.split(': <b>')[0]):
            ru, s = t.split(': ', 1)
        else:
            ru, s = '', t
        s = plain(s)
        mt = re.search(r'\s*\(([^()]+)\)\s*$', s)
        if mt and '___' not in mt.group(1): hint, s = (hint + '; ' if hint else '') + mt.group(1), s[:mt.start()]
        ru = plain(ru)
        if re.fullmatch(r'(Пауль|Алина|Ева|Йонас|Фрау Шмитц)[^:]{0,40}', ru): s, ru = f'{ru}: {s}', ''
        s = re.sub(r'([.?!])\s+(Пауль|Алина|Ева|Йонас|Фрау Шмитц)([^:]{0,40}):', r'\1 — \2\3:', s)
        vs = variants(a)
        gaps = s.count('___')
        if gaps > 1 and vs and '…' in vs[0]:
            parts = [x.strip() for x in vs[0].split('…')]
            items = []
            for g in range(gaps):
                t2 = s
                for h in range(gaps):
                    t2 = t2.replace('___', '\x00' if h == g else parts[h] if h < g else '…', 1)  # следующие пропуски не подсказываем
                items.append({'s': t2.replace('\x00', '___'), 'ru': ru, 'a': [parts[g]], 'hint': hint, 'n': e})
            return 'type*', items
        return 'type', {'s': s, 'ru': ru, 'a': vs, 'hint': hint, 'n': e}
    # перевод: собрать из слов ответа
    v = variants(a)
    if not v or not v[0]: return None, None
    toks = v[0].split()
    same = [x for x in v if sorted(x.split()) == sorted(toks)]
    return 'build', {'ru': plain(t), 'w': toks, 'ok': same, 'n': e}

COL = ['violet', 'sun', 'blue', 'teal', 'coral', 'pink']; SH = ['circle', 'penta', 'cloud', 'flower', 'square', 'diamond']
TITLES = {'choice': 'Выбери', 'type': 'Впиши', 'build': 'Переведи', 'write': 'Напиши'}

def build(oebps, lesson):
    s = (Path(oebps) / 'text' / f'lesson-{lesson:02d}.xhtml').read_text()
    k = (Path(oebps) / 'text' / 'key.xhtml').read_text()
    practice, check, skipped = [], [], []
    for m in re.finditer(r'<section class="exercise" id="ex-\d+-([^"]+)">(.*?)</section>', s, re.S):
        ex, body = m.group(1), m.group(2)
        head = plain(txt(re.search(r'<h3[^>]*>(.*?)</h3>', body, re.S).group(1))).replace('ключ', '').strip()
        rubric = txt(re.search(r'<p class="rubric">(.*?)</p>', body, re.S).group(1))
        if 'class="audio"' in body: skipped.append(head); continue
        ans, expl = key_for(k, lesson, ex)
        lis = re.findall(r'<li value="(\d+)">(.*?)</li>', body, re.S)
        if len(lis) == 1 and ('Напишите' in rubric or 'записк' in rubric):
            before = s[max(0, m.start() - 1500): m.start()]
            fig = re.findall(r'<figure class="fig fig-pic"><img[^>]*alt="([^"]*)"', before)
            if fig: rubric = rubric + ' Что на рисунке: ' + html.unescape(fig[-1]).replace('Опора для письменного задания. ', '')
            sample = re.sub(r'^Образец:\s*', '', plain(ans.get(1, '')))
            stage = {'type': 'write', 'title': head, 'sub': plain(rubric), 'items': [{'q': plain(rubric), 'hint': plain(txt(lis[0][1])), 'ph': 'Напиши по-немецки…', 'ex': [sample] if sample else [], 'check': [plain(expl.get(1, ''))]}]}
            practice.append(stage); continue
        groups = {}
        for n, li in lis:
            kind, it = item_stage(li, int(n), ans, expl, rubric)
            if kind == 'type*': groups.setdefault('type', []).extend(it)
            elif kind: groups.setdefault(kind, []).append(it)
        for kind, items in groups.items():
            st = {'type': kind, 'title': head if len(groups) == 1 else f'{head}: {TITLES[kind].lower()}', 'sub': plain(rubric), 'items': items}
            (check if '.C' in head or 'Проверь' in head else practice).append(st)
    for i, st in enumerate(practice + check):
        st['color'], st['shape'] = COL[i % 6], SH[i % 6]
    return practice, check, skipped

if __name__ == '__main__':
    oebps, lesson, out = sys.argv[1], int(sys.argv[2]), Path(sys.argv[3])
    p, c, sk = build(oebps, lesson)
    print('пропущено (аудио):', sk)
    for suf, stages, title in (('P', p, 'Практика урока'), ('C', c, 'Проверь себя')):
        doc = {'title': title, 'topic': f'Книга · урок {lesson}', 'sub': f'Упражнения урока {lesson} из книги, ответы и объяснения по её ключу.' if suf == 'P' else f'Пять заданий в конце урока {lesson}: быстро понять, всё ли усвоено.',
               'order': 0, 'createdAt': '2026-11-14', 'book': {'l': lesson, 's': f'{lesson}.{suf}', 'kind': suf}, 'stages': stages}
        (out / f'book-{lesson:02d}-{suf}.json').write_text(json.dumps(doc, ensure_ascii=False, indent=1) + '\n')
        print(suf, [(st['type'], len(st['items'])) for st in stages])
