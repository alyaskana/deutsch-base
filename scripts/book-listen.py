#!/usr/bin/env python3
"""Аудио-упражнения книги: этапы listen + script в book-NN-P.json и audio-доки scene.<id>.<k>.

  python3 scripts/hoer/render.py data/book/listen/<id>.scene.json RENDER_DIR   # озвучка (ElevenLabs), один раз
  python3 scripts/book-listen.py RENDER_DIR UNITS_DIR AUDIO_OUT [id ...]

data/book/listen/<id>.scene.json: реплики по «Тексту записи» из ключа книги (голоса разных регионов)
и ex — вопросы по пунктам книги: [вопрос, [верный, …], цитата реплики, пояснение из ключа].
Этап встаёт в «Практику урока» на место упражнения (по номеру); повторный запуск заменяет его."""
import base64, json, os, re, sys
from pathlib import Path

root = Path(__file__).resolve().parent.parent
LIMIT = 240_000


def k_of(lines, quote):
    f = re.sub(r'<[^>]+>', '', quote).replace('…', '').strip(' .!?')
    for i, l in enumerate(lines):
        if f.lower() in l['de'].lower():
            return i
    sys.exit('нет реплики для: ' + quote)


def num(title):
    m = re.search(r'(\d+)\.(\d+)', title)
    return int(m.group(2)) if m else 99


def main(rdir, units, out, ids):
    os.makedirs(out, exist_ok=True)
    for f in sorted((root / 'data/book/listen').glob('*.scene.json')):
        sc = json.loads(f.read_text())
        sid, sp = sc['id'], sc['ex']
        if ids and sid not in ids:
            continue
        meta = json.load(open(f'{rdir}/{sid}.json'))
        b = base64.b64encode(open(f'{rdir}/{sid}.mp3', 'rb').read()).decode()
        parts = [b[i:i + LIMIT] for i in range(0, len(b), LIMIT)]
        for k, p in enumerate(parts):
            json.dump({'b': p, 'n': len(parts)}, open(f'{out}/scene.{sid}.{k}.json', 'w'))
        lines = [{'who': l['who'], 'de': l['de'], 'ru': l['ru']} for l in sc['lines']]
        exn = sp['title'][-4:]
        st = [{'type': 'listen', 'title': sp['title'], 'scene': sp['scene'], 'cap': sp['cap'], 'color': 'blue', 'shape': 'cloud', 'mins': 2,
               'sub': sp['sub'], 'audio': {'id': sid, 'n': len(parts), 'dur': meta['dur'], 't': meta['t']}, 'speakers': sp['speakers'],
               'lines': lines, 'gloss': sp.get('gloss', {}),
               'items': [{'q': q, 'o': o, 'a': o[0], 'n': f'{quote}. {ex}', 'k': k_of(lines, quote)} for q, o, quote, ex in sp['qs']]},
              {'type': 'script', 'title': 'Текст записи ' + exn, 'color': 'blue', 'shape': 'cloud', 'items': [],
               'sub': 'Послушай ещё раз и следи по тексту. Кнопка у реплики повторяет только её.'}]
        lesson = int(sid.split('-')[1])
        pf = Path(units) / f'book-{lesson:02d}-P.json'
        d = json.loads(pf.read_text())
        d['stages'] = [s for s in d['stages'] if s.get('audio', {}).get('id') != sid and s.get('title') != 'Текст записи ' + exn]
        n = num(sp['title'])
        i = next((j for j, s in enumerate(d['stages']) if num(s['title']) > n and s['type'] != 'script'), len(d['stages']))
        d['stages'][i:i] = st
        pf.write_text(json.dumps(d, ensure_ascii=False, indent=1) + '\n')
        print(sid, 'частей', len(parts), [s['title'] for s in d['stages']])


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4:])
