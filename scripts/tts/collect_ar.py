"""Collect Artikelregen words ("der Tisch") to voice. Usage: collect_ar.py <extra_words dir> <out.json> [page.html]
extra_words dir: ArtifactData list out_dir of collection "extra_words" (one JSON per word).
page.html (optional): the Artikelregen page, to include the WORDS list built into it."""
import json,glob,re,sys,os
sys.path.insert(0,os.path.dirname(__file__))
from akey import key
d,out=sys.argv[1],sys.argv[2]
W=[]
if len(sys.argv)>3:
    m=re.search(r'const WORDS = (\[.*?\]);\n',open(sys.argv[3]).read(),re.S);W=json.loads(m.group(1))
for f in sorted(glob.glob(d+'/*.json')):
    x=json.load(open(f));W.append(x.get('data',x))
items=[];seen=set()
for w in W:
    if not w.get('w') or w.get('g') not in ('der','die','das'):continue
    t=f"{w['g']} {w['w']}";k=key(t)
    if k not in seen:seen.add(k);items.append([k,t,'d'])
json.dump([['_ar',items]],open(out,'w'),ensure_ascii=False)
print('words',len(items))
