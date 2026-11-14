#!/usr/bin/env python3
"""Словарь урока книги «Немецкий от А до Ja!» → data/book/vocab/NN.json

  python3 -I scripts/book-vocab.py <OEBPS> <урок> [<урок>...]

Строка: {"de": "der Markt", "lemma": "Markt", "art": "der", "pl": "die Märkte", "forms": "", "ipa": "[maʁkt]", "ru": "рынок"}
pl — множественное число существительного; forms — формы глагола или пометка вида «обычно без множественного»."""
import html, json, os, re, sys

root = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
txt = lambda s: re.sub(r" ([,;:)])", r"\1", re.sub(r"\( ", "(", re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", s))))).strip()


def lesson(oebps, n):
    t = open(f"{oebps}/text/lesson-{n:02d}.xhtml", encoding="utf8").read()
    sec = re.search(r'<section class="vocab">(.*?)</section>', t, re.S)
    if not sec:
        sys.exit(f"урок {n}: нет словаря")
    out = []
    for tr in re.findall(r"<tr>(.*?)</tr>", sec.group(1), re.S):
        td = re.findall(r"<td[^>]*>(.*?)</td>", tr, re.S)
        if len(td) < 4:
            continue
        de = txt(re.sub(r'<span class="gmark".*?</span>', "", td[0]))
        m = re.match(r"(der|die|das) (.+)$", de)
        second = txt(td[1])
        is_de = 'lang="de"' in td[1]
        noun = bool(m) or (de[:1].isupper() and " " not in de)
        out.append({"de": de, "lemma": m.group(2) if m else de, "art": m.group(1) if m else "",
                    "pl": second if is_de and noun else "", "forms": "" if is_de and noun else second,
                    "ipa": txt(td[2]), "ru": txt(td[3])})
        w = out[-1]
        if w["forms"] in ("–", "-"):
            w["forms"] = ""
        f, ru1 = w["forms"], w["ru"].split(",")[0].split(" ")[0]
        w["pos"] = ("noun" if w["art"] else "prep" if re.search(r"\+ Akkusativ|\+ Dativ|с Dativ", f) else
                    "pron" if "Akkusativ от" in f or w["lemma"] == "kein" else "phrase" if " " in w["lemma"] else
                    "verb" if re.search(r"(^|, )(hat|ist) |^\w+t(,|$)", f) else
                    "adj" if re.search(r"(ый|ий|ой)$", ru1) else "adv")
    return out


def main(oebps, ns):
    os.makedirs(f"{root}/data/book/vocab", exist_ok=True)
    for n in map(int, ns):
        v = lesson(oebps, n)
        json.dump({"l": n, "words": v}, open(f"{root}/data/book/vocab/{n:02d}.json", "w", encoding="utf8"), ensure_ascii=False, indent=1)
        print(n, len(v), "слов")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2:])
