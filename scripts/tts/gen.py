"""Synthesize clips with OpenAI TTS and check each one by speech recognition.
Usage: gen.py <texts.json> <outdir> [--have have.json] [--report report.json]
texts.json: [[group, [[key, text, kind], ...]], ...] from collect.py
have.json: {hash: docId} — clips already in the artifact (skipped).
Writes <outdir>/<hash>.mp3 and <outdir>/report.json (ASR mismatches).
The API key is injected by the environment proxy for api.openai.com (no key in code)."""
import json,os,re,sys,subprocess,time,urllib.request,concurrent.futures as cf
sys.path.insert(0,os.path.dirname(__file__))
from akey import ahash,key
VOICE=os.environ.get('TTS_VOICE','marin')
MODEL='gpt-4o-mini-tts'
I_SENT='Sprich klares, natürliches Hochdeutsch wie eine Muttersprachlerin aus Deutschland. Ruhig und etwas langsamer als normal, deutliche Aussprache, korrekte Wortbetonung, neutrale freundliche Intonation.'
I_WORD='Sprich nur dieses deutsche Wort oder diese kurze Wortgruppe, klar und deutlich wie in einem Wörterbuch, mit korrekter Betonung, Hochdeutsch.'
def post(url,data=None,files=None,timeout=120):
    if files is None:
        req=urllib.request.Request(url,data=json.dumps(data).encode(),headers={'Content-Type':'application/json'})
    else:
        b='----tts'+str(time.time_ns());body=b''
        for k,v in data.items():body+=f'--{b}\r\nContent-Disposition: form-data; name="{k}"\r\n\r\n{v}\r\n'.encode()
        for k,(fn,blob) in files.items():body+=f'--{b}\r\nContent-Disposition: form-data; name="{k}"; filename="{fn}"\r\nContent-Type: audio/mpeg\r\n\r\n'.encode()+blob+b'\r\n'
        body+=f'--{b}--\r\n'.encode()
        req=urllib.request.Request(url,data=body,headers={'Content-Type':'multipart/form-data; boundary='+b})
    for i in range(5):
        try:
            with urllib.request.urlopen(req,timeout=timeout) as r:return r.read()
        except Exception as e:
            if i==4:raise
            time.sleep(2**i)
def tts(text,kind):
    word=kind in ('t','d','w','v') and len(text.split())<=3
    raw=post('https://api.openai.com/v1/audio/speech',{'model':MODEL,'voice':VOICE,'input':text.replace('…',' … '),'instructions':I_WORD if word else I_SENT,'response_format':'mp3'})
    p=subprocess.run(['ffmpeg','-loglevel','error','-i','-','-af','silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse,adelay=60|60,apad=pad_dur=0.12','-ac','1','-ar','24000','-b:a','40k','-f','mp3','-'],input=raw,capture_output=True,check=True)
    return p.stdout
def asr(blob):
    return post('https://api.openai.com/v1/audio/transcriptions',{'model':'gpt-4o-transcribe','language':'de','response_format':'text'},{'file':('a.mp3',blob)}).decode().strip()
def one(item,out):
    k,text,kind=item;h=ahash(k);fn=f'{out}/{h}.mp3'
    if not os.path.exists(fn):
        blob=tts(text,kind);open(fn,'wb').write(blob)
    blob=open(fn,'rb').read()
    heard=asr(blob)
    return h,k,text,kind,heard,len(blob)
if __name__=='__main__':
    src,out=sys.argv[1],sys.argv[2];os.makedirs(out,exist_ok=True)
    have=json.load(open(sys.argv[sys.argv.index('--have')+1])) if '--have' in sys.argv else {}
    items=[x for g,t in json.load(open(src)) for x in t if ahash(x[0]) not in have]
    print('to do',len(items),flush=True)
    rep=[];n=0
    with cf.ThreadPoolExecutor(8) as ex:
        for h,k,text,kind,heard,sz in ex.map(lambda x:one(x,out),items):
            n+=1
            if key(heard)!=k:rep.append({'h':h,'text':text,'kind':kind,'heard':heard})
            if n%100==0:print(n,len(rep),flush=True)
    rp=sys.argv[sys.argv.index('--report')+1] if '--report' in sys.argv else out+'/report.json'
    json.dump(rep,open(rp,'w'),ensure_ascii=False,indent=1)
    print('done',n,'mismatch',len(rep))
