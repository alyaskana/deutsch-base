"""Text key and clip id — must match akey() and ahash() in the Mein Deutsch page."""
import re
def key(s):
    s=re.sub(r'<[^>]+>','',str(s or '')).replace('___',' ').lower()
    s=re.sub(r'[^a-zäöüß0-9\s]',' ',s);return re.sub(r'\s+',' ',s).strip()
def _fnv(b,h):
    for c in b:h=((h^c)*16777619)&0xffffffff
    return h
def ahash(k):
    b=k.encode('utf-8');return '%08x%08x'%(_fnv(b,2166136261),_fnv(b,0x811c9dc5^0x5bd1e995))
