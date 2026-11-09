#!/usr/bin/env python3
"""«Послушать историю»: запись серии целиком, рассказчик с интонацией и герои своими голосами.

  python3 scripts/hoer/render.py data/lesen/story/<id>.json RENDER   # запись (ElevenLabs eleven_v3) и проверка на слух
  python3 scripts/lesen-story.py RENDER OUT <id>…                    # нарезка для базы и время абзацев

data/lesen/story/<id>.json — как сценка «Слушаем» (lines: who, voice, de, tag) плюс p — номер абзаца истории.
Числа в de писать словами. Пишет OUT/audio/scene.<id>.<k>.json {b, n} и поле audio {id,n,dur,t}
в data/lesen/audio.json (t — [начало, конец] каждого абзаца). Потом node scripts/lesen.mjs."""
import base64, json, os, sys
LIMIT = 240_000
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
rdir, out, ids = sys.argv[1], sys.argv[2], sys.argv[3:]
os.makedirs(out + "/audio", exist_ok=True)
for sid in ids:
    sc = json.load(open(f"{root}/data/lesen/story/{sid}.json"))
    meta = json.load(open(f"{rdir}/{sid}.json"))
    b = base64.b64encode(open(f"{rdir}/{sid}.mp3", "rb").read()).decode()
    parts = [b[i:i + LIMIT] for i in range(0, len(b), LIMIT)]
    for k, p in enumerate(parts):
        json.dump({"b": p, "n": len(parts)}, open(f"{out}/audio/scene.{sid}.{k}.json", "w"))
    t = {}
    for l, (a, z) in zip(sc["lines"], meta["t"]):
        t[l["p"]] = [min(t.get(l["p"], [a, z])[0], a), max(t.get(l["p"], [a, z])[1], z)]
    audio = {"id": sid, "n": len(parts), "dur": meta["dur"], "t": [t[k] for k in sorted(t)]}
    A = f"{root}/data/lesen/audio.json"
    m = json.load(open(A)) if os.path.exists(A) else {}
    m[sid] = audio
    json.dump(m, open(A, "w"), ensure_ascii=False, indent=1)
    print(sid, len(parts), "частей,", meta["dur"], "с, абзацев", len(audio["t"]))
