"""Collect every German text Mein Deutsch can voice. Usage: collect.py <dbdir> <out.json>
Mirrors the page: sentDe() for task sentences, dictionary rows, saved words, single words from lessons."""
import json,glob,re,sys
DB,OUT=sys.argv[1],sys.argv[2]
CYR=re.compile('[А-Яа-яЁё]')
WORD=re.compile(r"[A-Za-zÄÖÜäöüß]+(?:-[A-Za-zÄÖÜäöüß]+)*")
def plain(s):return re.sub(r'\s+',' ',re.sub(r'<[^>]+>','',str(s or ''))).strip()
def key(s):
    s=re.sub(r'<[^>]+>','',str(s or '')).replace('___',' ').lower()
    s=re.sub(r'[^a-zäöüß0-9\s]',' ',s);return re.sub(r'\s+',' ',s).strip()
def first(a):return a[0] if isinstance(a,list) and a else a
def sent_de(it,st):
    t=st.get('type')
    if t=='chat':return f"{it.get('l','')} — {(it.get('y') or '').replace('___',str(first(it.get('a')) or ''),1)}"
    if t=='spot':return re.sub(r'\[([^\]]+)\]\*?',r'\1',it.get('s') or '')
    if t in('tf','fix') and isinstance(it.get('t'),list):  # sentence as corrected: the wrong word is never voiced
        w=list(it['t'])
        if it.get('bad') is not None and it.get('a') is not None:w[it['bad']]=str(first(it['a']))+(re.search(r'[.,!?;:]*$',str(w[it['bad']])).group(0))
        return plain(' '.join(w))
    if t=='dict':return plain(it.get('s') or '')
    if it.get('aux') and it.get('p') and isinstance(it.get('s'),str):
        return plain(re.sub(r'<br>.*$','',it['s']).replace('___',it['aux'],1).replace('___',it['p'],1))
    if t=='build' and isinstance(it.get('ok'),list) and it['ok']:
        o=it['ok'][0];return plain(' '.join(o) if isinstance(o,list) else o)
    a=first(it.get('a'))
    return plain(re.sub(r'<br>.*$','',it.get('s') or '').replace('___',str(a) if a else '…',1))
def stages(l):
    for st in l.get('stages') or []:yield st
    for ch in l.get('chapters') or []:
        for st in ch.get('stages') or []:yield st
SKIP={'color','shape','type','id','pic','icon','cover','kind','createdAt','order','partner','tr','trf','ru','n','sub','title','topic','hint','note','bins','skill','theory','ask','pin','ph','check','q'}
def german_strings(o,k=None):
    if isinstance(o,str):
        if k not in SKIP and not CYR.search(o) and WORD.search(o):yield o
    elif isinstance(o,list):
        for x in o:yield from german_strings(x,k)
    elif isinstance(o,dict):
        for kk,v in o.items():
            if kk in SKIP or kk=='dict':continue
            yield from german_strings(v,kk)
groups=[];seen=set()
STOP={'ie','ei','akk','dat','nom','gen','acc','sg','pl'}
def add(g,t,kind):
    if kind=='t' and t.lower() in STOP:return
    t=plain(t).replace('___','…').strip(' —')
    k=key(t)
    if not k or k in seen or len(t)>240 or CYR.search(t):return
    seen.add(k);g.append([k,t,kind])
for f in sorted(glob.glob(DB+'/lessons/*.json')):
    lid=f.split('/')[-1][:-5]
    if lid.startswith('_'):continue
    l=json.load(open(f));g=[]
    for st in stages(l):  # диктант первым: та же фраза в другом этапе не должна забрать её себе с обычным голосом
        if st.get('type')=='dict':
            for it in st.get('items') or []:
                if isinstance(it,dict):add(g,sent_de(it,st),'k')
    for st in stages(l):
        for it in st.get('items') or []:
            if isinstance(it,dict) and (it.get('tr') or it.get('trf')):add(g,sent_de(it,st),'k' if st.get('type')=='dict' else 's')  # k = диктант: разные голоса
            if isinstance(it,dict) and st.get('type')=='chat':  # page voices the partner line on show and only the reply after an answer
                add(g,it.get('l',''),'s');add(g,(it.get('y') or '').replace('___',str(first(it.get('a')) or ''),1),'s')
    for vg in l.get('vocab') or []:
        for w in vg.get('w') or []:
            if w and isinstance(w[0],str):add(g,w[0],'w')
    # tf/fix sentences contain a deliberate mistake: voice only the corrected sentence, not their words
    l_words=l if all(st.get('type') not in('tf','fix') for st in stages(l)) else {**l,'stages':[st for st in stages(l) if st.get('type') not in('tf','fix')],'chapters':[]}
    for s in german_strings(l_words):
        for w in WORD.findall(plain(re.sub(r'\{\{([^|}]+)\|[^}]*\}\}',r'\1',s))):add(g,w,'t')
    groups.append([lid,g])
d=json.load(open(DB+'/lessons/_dict.json'));j=json.loads(d['j']) if isinstance(d['j'],str) else d['j']
g=[]
for r in j['d']:
    lemma=r[0];art=r[1] if len(r)>1 else ''
    add(g,(art+' '+lemma) if art and not re.match(r'^(der|die|das)\s',lemma,re.I) else lemma,'d')
groups.append(['_dict',g])
p=json.load(open(DB+'/data/users/me/progress.json'));g=[]
for x in p.get('saved') or []:
    if not x.get('del') and x.get('de'):add(g,x['de'],'v')
groups.append(['_saved',g])
json.dump(groups,open(OUT,'w'),ensure_ascii=False,indent=0)
for n,t in groups:print(n,len(t),sum(len(x[1]) for x in t))
print('total',sum(len(t) for n,t in groups),sum(len(x[1]) for n,t in groups for x in t))
