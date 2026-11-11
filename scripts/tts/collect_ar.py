"""Collect the article game's words ("der Tisch") to voice for Mein Deutsch.
Usage: collect_ar.py <build/artikel.json> <out.json>
The game moved from Artikelregen into Mein Deutsch on 2026-11-12: its words (rules, words, hints) are built by
scripts/artikel.mjs into build/artikel.json; the clips go into Mein Deutsch's own "audio" collection, group "_ar"."""
import json,sys,os
sys.path.insert(0,os.path.dirname(__file__))
from akey import key
src,out=sys.argv[1],sys.argv[2]
A=json.load(open(src))
G={'r':'der','e':'die','s':'das'}
items=[];seen=set()
def add(t):
    k=key(t)
    if k not in seen:seen.add(k);items.append([k,t,'d'])
for w in A['W']:
    g=G.get(w[1],w[1])
    if w[0] and g in ('der','die','das'):add(f"{g} {w[0]}")
for r in A['R']:
    for s in r.get('ex') or []:
        a=s.split(':')[0].strip()
        if a.split(' ')[0] in ('der','die','das'):add(a)
json.dump([['_ar',items]],open(out,'w'),ensure_ascii=False)
print('words',len(items))
