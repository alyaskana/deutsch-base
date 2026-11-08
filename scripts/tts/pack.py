"""Pack clips into Mein Deutsch database documents.
Usage: pack.py <texts.json> <clipdir> <outdir> [--index current_index.json] [--replace hashes.json]
Writes <outdir>/<docId>.json chunk docs {c:{hash:base64}} and <outdir>/_index.json {v,voice,at,m:{hash:docId}}.
Chunk ids: <group>.<n>; with --index, existing clips are kept and new ones go to new chunks.
--replace: these hashes are packed again into new chunks (a new take or voice); old chunks stay untouched."""
import json,os,sys,base64,datetime
sys.path.insert(0,os.path.dirname(__file__))
from akey import ahash
LIMIT=240_000  # bytes of base64 per document (ArtifactData writes at most 256 KiB per document)
src,clips,out=sys.argv[1:4];os.makedirs(out,exist_ok=True)
idx=json.load(open(sys.argv[sys.argv.index('--index')+1])) if '--index' in sys.argv else {'m':{}}
m=idx.get('m',{})
repl=set(json.load(open(sys.argv[sys.argv.index('--replace')+1]))) if '--replace' in sys.argv else set()
used={}
for d in m.values():
    g,n=d.rsplit('.',1);used[g]=max(used.get(g,-1),int(n))
written=[]
for g,items in json.load(open(src)):
    gid=''.join(ch if ch.isalnum() or ch in '_-' else '-' for ch in g)
    new=[ahash(k) for k,t,kind in items if (ahash(k) not in m or ahash(k) in repl) and os.path.exists(f'{clips}/{ahash(k)}.mp3')]
    new=list(dict.fromkeys(new))
    n=used.get(gid,-1);cur={};size=0
    def flush():
        global n,cur,size
        if not cur:return
        n+=1;doc=f'{gid}.{n}';json.dump({'c':cur},open(f'{out}/{doc}.json','w'))
        for h in cur:m[h]=doc;repl.discard(h)
        written.append(doc);cur={};size=0
    for h in new:
        b=base64.b64encode(open(f'{clips}/{h}.mp3','rb').read()).decode()
        if size+len(b)>LIMIT:flush()
        cur[h]=b;size+=len(b)
    flush()
idx={'v':1,'voice':os.environ.get('TTS_VOICE','marin'),'at':datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%MZ'),'m':m}
json.dump(idx,open(f'{out}/_index.json','w'),separators=(',',':'))
print('docs',len(written),'clips in index',len(m),'index bytes',os.path.getsize(f'{out}/_index.json'))
print('\n'.join(written))
