#!/usr/bin/env python3
"""Build Mein Deutsch lesson docs + audio part docs from data/hoeren/scenes.json and rendered scenes.

  python3 scripts/hoer/build.py data/hoeren/scenes.json RENDER_DIR OUT_DIR [ids...]

OUT_DIR/lessons/<id>.json — lesson (stages: listen → choice haben/sein → spot Partizip II)
OUT_DIR/audio/scene.<id>.<k>.json — {b: base64 part, n: parts}; ≤ 240 000 chars each."""
import base64, json, os, re, sys
LIMIT = 240_000
THEORY = {"t": "haben или sein", "p": [
    "Perfekt = <b>haben</b> или <b>sein</b> + Partizip II в конце.",
    "<b>sein</b> — когда меняется место или состояние: fahren, kommen, gehen, aufstehen, kaputtgehen. И ещё <b>bleiben</b> и <b>passieren</b>.",
    "Все остальные глаголы — с <b>haben</b>: machen, warten, sehen, schlafen, essen."],
    "ex": [["Wir <b>sind</b> nach Korfu gefahren.", "движение → sein"], ["Wir <b>haben</b> Pizza bestellt.", "нет движения → haben"]]}


def line_of(s, note):
    """index of the dialogue line the answer note quotes"""
    frag = re.sub(r"<[^>]+>", "", note).strip(" .…!?")
    frag = frag.replace("…", "").strip()
    for i, l in enumerate(s["lines"]):
        if frag and frag.lower() in l["de"].lower():
            return i
    sys.exit(f"{s['id']}: note does not quote a line: {note}")


def main(src, rdir, out, ids):
    S = json.load(open(src))
    os.makedirs(f"{out}/lessons", exist_ok=True)
    os.makedirs(f"{out}/audio", exist_ok=True)
    for s in S:
        if ids and s["id"] not in ids:
            continue
        sid = s["id"]
        meta = json.load(open(f"{rdir}/{sid}.json"))
        b = base64.b64encode(open(f"{rdir}/{sid}.mp3", "rb").read()).decode()
        parts = [b[i:i + LIMIT] for i in range(0, len(b), LIMIT)]
        for k, p in enumerate(parts):
            json.dump({"b": p, "n": len(parts)}, open(f"{out}/audio/scene.{sid}.{k}.json", "w"))
        who = list(dict.fromkeys(l["who"] for l in s["lines"]))
        places = ", ".join(f"{w} ({s['speakers'][w]})" for w in who)
        lesson = {
            "createdAt": s.get("createdAt", "2026-11-09"), "order": s["order"], "title": s["title"],
            "topic": "Слушаем · Perfekt", "sub": f"Разговор на слух: {places}. Потом Perfekt с haben и sein.",
            "gloss": s.get("gloss", {}),
            "stages": [
                {"type": "listen", "title": "Слушаем разговор", "scene": s["title"], "cap": s["cap"], "color": "blue", "shape": "cloud", "mins": 2,
                 "sub": "Слушаем разговор и отвечаем на вопросы",
                 "audio": {"id": sid, "n": len(parts), "dur": meta["dur"], "t": meta["t"]},
                 "speakers": s["speakers"], "lines": [{"who": l["who"], "de": l["de"], "ru": l["ru"]} for l in s["lines"]],
                 "items": [{"q": q, "o": o, "a": o[0], "n": n, "k": line_of(s, n)} for q, o, n in s["qs"]]},
                {"type": "script", "title": "Текст разговора", "color": "blue", "shape": "cloud", "items": [],
                 "sub": "Послушай ещё раз и следи по тексту. Кнопка у реплики повторяет только её."},
                {"type": "choice", "title": "haben или sein?", "color": "coral", "shape": "circle", "skill": "Perfekt: haben или sein",
                 "sub": "Фразы из разговора. sein — когда меняется место или состояние.", "theory": THEORY,
                 "items": [{"s": x, "ru": ru, "tr": ru, "a": a, "o": [a, w], "n": n} for x, ru, a, w, n in s["ch"]]},
                {"type": "spot", "title": "Найди Partizip II", "color": "teal", "shape": "diamond",
                 "q": "Нажми на все <b>Partizip II</b> (вторая часть Perfekt)", "sub": "Partizip II обычно стоит в конце фразы",
                 "items": [{"s": x, "tr": tr, "n": n} for x, tr, n in s["sp"]]}]}
        json.dump(lesson, open(f"{out}/lessons/{sid}.json", "w"), ensure_ascii=False)
        print(sid, "parts", len(parts), "lesson bytes", os.path.getsize(f"{out}/lessons/{sid}.json"))


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4:])
