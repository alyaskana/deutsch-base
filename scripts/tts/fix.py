"""Second pass for clips that speech recognition heard differently.
Usage: fix.py <report.json> <clipdir> <flagged.json>
For each clip: ask a second recognizer (whisper-1); if neither hears the text, synthesize again
(up to 2 takes) and keep the first take that is heard correctly. The rest go to flagged.json
for the native-speaker check."""
import json,os,sys,concurrent.futures as cf
sys.path.insert(0,os.path.dirname(__file__))
from akey import key
import gen
def heard(blob,model):
    return gen.post('https://api.openai.com/v1/audio/transcriptions',{'model':model,'language':'de','response_format':'text'},{'file':('a.mp3',blob)}).decode().strip()
def ok(blob,k):
    for m in ('whisper-1','gpt-4o-transcribe'):
        h=heard(blob,m)
        if key(h)==k or key(h).replace(' ','')==k.replace(' ',''):return True,h
    return False,h
def one(r,clips):
    k=key(r['text']);fn=f"{clips}/{r['h']}.mp3"
    good,h=ok(open(fn,'rb').read(),k)
    if good:return None
    for _ in range(2):
        blob=gen.tts(r['text'],r['kind']);good,h2=ok(blob,k)
        if good:open(fn,'wb').write(blob);return None
    return {**r,'heard2':h}
if __name__=='__main__':
    rep,clips,out=sys.argv[1:4]
    rs=json.load(open(rep))
    with cf.ThreadPoolExecutor(6) as ex:res=[x for x in ex.map(lambda r:one(r,clips),rs) if x]
    json.dump(res,open(out,'w'),ensure_ascii=False,indent=1)
    print('checked',len(rs),'still flagged',len(res))
