#!/usr/bin/env python3
"""Перенос «Мозаики» в Mein Deutsch: применяет правки к свежей копии живой страницы.
usage: apply.py base.html out.html"""
import sys,re
src,dst=sys.argv[1:3]
s=open(src).read()
def rep(old,new,count=1):
    global s
    assert s.count(old)>=1, 'not found: '+old[:80]
    if count==1: assert s.count(old)==1, 'ambiguous (%d): %s'%(s.count(old),old[:80])
    s=s.replace(old,new)

# ---------- 1. Палитра «Молоко»: жёстко прописанные сиреневые оттенки ----------
for a,b in [('#CFBDF6','#F4EFE8'),('#C3AEF1','#EDE6DC'),('#F5F0FD','#F4EFE8'),('#E7DEF8','#E6DFD3'),
            ('#E3D9F7','#E0D8CC'),('#E2D9F5','#E0D8CC'),('#DCD4EE','#E9E2D8'),('#C9BFE0','#E0D8CC'),
            ('rgba(207,189,246,0)','rgba(244,239,232,0)'),('#6B6290','#5F587C'),('#A79FC4','#857E9F')]:
    s=re.sub(re.escape(a),b,s,flags=re.I)
rep('body{background:var(--ground);background-image:radial-gradient(rgba(255,255,255,.28) 1.5px,transparent 1.6px)','body{background:var(--ground);background-image:radial-gradient(rgba(43,36,64,.06) 1.5px,transparent 1.6px)')
rep('--good:#16B37A; --good-l:#DDF6EA; --bad:#F0465A; --bad-l:#FFE3E6;','--good:#0E8A5E; --good-l:#DDF6EA; --bad:#C9283B; --bad-l:#FFE3EA;')

# ---------- 2. Экраны урока ----------
# письмо: вопрос темы в реплике, задание заголовком ниже
rep('''<div class="bubble plain">${rich(it.q)}</div></div>
      ${it.hint?`<p class="hint">${rich(it.hint)}</p>`:''}''',
'''<div class="bubble plain">${rich(wSplit(it.q)[0])}</div></div>
      ${wSplit(it.q)[1]?`<h3 class="wtask">${esc(wSplit(it.q)[1])}</h3>`:''}${it.hint?`<p class="hint">${rich(it.hint)}</p>`:''}''')
rep('function runWrite(st){','/* «Вопрос темы. Напиши 1–2 предложения.» → [вопрос, задание] */\nfunction wSplit(q){const m=String(q).match(/^([\\s\\S]*?)\\s*(Напиши[^.!?]*)[.!]?\\s*$/);return m&&m[1].trim()?[m[1].trim(),m[2]]:[q,\'\']}\nfunction runWrite(st){')
# голоса: аватарки-персонажи
a=s.index('function voicesHTML(st){');b=s.index('\n',a)
s=s[:a]+r'''/* лица голосов: набор персонажей, по порядку появления в разговоре */
const AV=[{bg:'#DDEFFB',skin:'#F6CDAE',hair:'#7A3E22',shirt:'#5B86F0',f:1},{bg:'#FFE0D2',skin:'#EDBE9A',hair:'#2B2440',shirt:'#FF6B4A',f:0},{bg:'#FFF3CF',skin:'#D9A27C',hair:'#1F1640',shirt:'#1BBFA5',f:1},{bg:'#DDF6EA',skin:'#F6CDAE',hair:'#C98A2B',shirt:'#7444E6',f:0}];
function avSVG(k){const F=AV[k%AV.length],id='avc'+k;return `<svg class="av" viewBox="0 0 48 48" aria-hidden="true"><defs><clipPath id="${id}"><circle cx="24" cy="24" r="24"/></clipPath></defs><g clip-path="url(#${id})"><rect width="48" height="48" fill="${F.bg}"/>${F.f?`<path d="M10.5 23c0-9.5 6-15 13.5-15s13.5 5.5 13.5 15v14h-27z" fill="${F.hair}"/>`:''}<path d="M7 50c0-10 7.5-15 17-15s17 5 17 15z" fill="${F.shirt}"/><rect x="20.5" y="28" width="7" height="9.5" rx="3.5" fill="${F.skin}"/><ellipse cx="24" cy="22.5" rx="9" ry="10" fill="${F.skin}"/>${F.f?`<path d="M14.5 21.5c.5-7.5 5-10.5 10-10.5 5.5 0 9 3.5 9 10.5-4.5-.5-8-2.5-10-6-1.5 3.5-4.5 5.5-9 6z" fill="${F.hair}"/>`:`<path d="M14.3 21c-.8-8 4-12 9.700-12s10.5 4 9.700 12c-1.5-3.5-4.5-5.3-9.700-5.3s-8.200 1.800-9.700 5.3z" fill="${F.hair}"/><path d="M15 24c.3 6.5 4 9.5 9 9.5s8.700-3 9-9.5c-1.5 3-4 4.200-9 4.200s-7.5-1.200-9-4.200z" fill="${F.hair}"/>`}<circle cx="20.5" cy="23" r="1.15" fill="#2B2440"/><circle cx="27.5" cy="23" r="1.15" fill="#2B2440"/><path d="M21.3 ${F.f?27:26.3}q2.700 2 5.400 0" stroke="${F.f?'#2B2440':'#fff'}" stroke-width="1.3" fill="none" stroke-linecap="round"/></g></svg>`}
function voicesHTML(st){const M=whoMap(st),P=st.speakers||{};return `<div class="voices">${Object.keys(M).map((w,k)=>`<span ${whoDot(st,w,M)}>${avSVG(k)}<em><b>${esc(w)}</b>${P[w]?`<small>${esc(P[w])}</small>`:''}</em></span>`).join('')}</div>`}'''.replace('.700','.7').replace('.200','.2').replace('.400','.4').replace('.800','.8')+s[b:]
# слушаем: плеер выше вопросов
a=s.index('  shell(`<div class="goal"><span class="label">Слушай и ищи ответ');b=s.index('\n',s.index('<div class="card lsn" id="lsn"',a))
blk=s[a:b];g_end=blk.index('</div>\n')+6
goal=blk[len('  shell(`'):g_end];rest=blk[g_end+1:].lstrip()
tail='<div style="height:90px" aria-hidden="true"></div>`);'
card=rest[:rest.index(tail)]
s=s[:a]+'  shell(`'+card+goal+tail+s[b:]
# черепашка вместо «Медленнее»
TURTLE='<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4.5 15.2a7 6.2 0 0 1 14 0z"/><circle cx="19.9" cy="12.6" r="2.3"/><rect x="6.2" y="14.6" width="3.2" height="4.4" rx="1.6"/><rect x="13.4" y="14.6" width="3.2" height="4.4" rx="1.6"/><path d="M4.8 14.2l-2.600 1 2.600.9z"/></svg>'.replace('.600','.6')
rep('function playerHTML(st,small){','const ICON_SLOW=\''+TURTLE+'\';\nfunction playerHTML(st,small){')
n=s.count('<button class="slow" aria-pressed="${SCN.slow}">Медленнее</button>');assert n==2,n
s=s.replace('<button class="slow" aria-pressed="${SCN.slow}">Медленнее</button>','<button class="slow" aria-pressed="${SCN.slow}" aria-label="Медленнее">${ICON_SLOW}</button>')
# диктант: фразу «говорит» маскот, без лишнего текста
rep('''html:it=>`<div class="w1play"><button class="w1pb" id="w1p" type="button" aria-label="Слушать">${ICON_SPK}</button><div class="w1pt"><span class="ru" style="margin:0">Слушай сколько угодно раз</span><button class="w1slow" id="w1s" type="button">Медленнее</button></div></div>''',
'''html:it=>`<div class="prompt dk">${mascot(st.shape,st.color)}<div class="bubble plain dkb"><button class="w1pb" id="w1p" type="button" aria-label="Слушать">${ICON_SPK}</button><span class="dkw" id="w1w" aria-hidden="true">${[8,14,22,12,26,18,10,24,16,28,12,20,8,16,24,10,18,12].map((h,i)=>`<i style="height:${h}px;animation-delay:${-(i%6)*.13}s"></i>`).join('')}</span><button class="w1slow slow" id="w1s" type="button" aria-label="Медленнее">${ICON_SLOW}</button></div></div>''')
rep('''$('w1p').onclick=()=>say(it.s);$('w1s').onclick=()=>say(it.s,true);setTimeout(()=>say(it.s),350);''',
'''const wave=slow=>{const w=$('w1w');if(!w)return;w.classList.add('on');clearTimeout(wave.t);wave.t=setTimeout(()=>w.classList.remove('on'),Math.min(9000,900+plainTxt(it.s).length*(slow?150:85)))};
      $('w1p').onclick=()=>{say(it.s);wave()};$('w1s').onclick=()=>{say(it.s,true);wave(true)};setTimeout(()=>{say(it.s);wave()},350);''')
# начало шага: правило сразу в карточке, без служебной строки и кнопки
rep('''<span class="label">Шаг ${stageIdx+1} из ${STAGES.length} · ${stageWord(st)}</span><h2>${esc(st.title)}</h2>''','''<h2>${esc(st.title)}</h2>''')
rep('''${st.theory?'<button class="rulebtn" id="rb"><i>?</i>Правило коротко</button>':''}</div>`);''','''${st.theory?theoryBody(st):''}</div>`);''')
rep('''<h2>${esc(st.title)}</h2>${st.sub?`<p class="mute">${esc(st.sub)}</p>`:''}${(st.type==='map'||st.type==='listen')''','''<h2>${esc(st.title)}</h2>${st.sub&&!st.theory?`<p class="mute">${esc(st.sub)}</p>`:''}${(st.type==='map'||st.type==='listen')''')
rep('''  shell(`<div class="card stagecard">${st.pic?''','''  shell(`<div class="card stagecard${st.theory?' hasth':''}">${st.pic?''')
rep('function showTheory(st){','''function theoryBody(st){const T=st.theory;return `<div class="th thin" style="--c:${col(st.color)}">${(T.p||[]).map(x=>`<p>${rich(x)}</p>`).join('')}${T.tab?`<div class="tab"><table>${T.tab.map((r,i)=>`<tr>${r.map(c=>i===0?`<th>${rich(c)}</th>`:`<td>${rich(c)}</td>`).join('')}</tr>`).join('')}</table></div>`:''}${T.ex?.length?`<div class="exs">${T.ex.map(x=>`<div class="ex"><div>${rich(x[0])}</div>${x[1]?`<span>${esc(x[1])}</span>`:''}</div>`).join('')}</div>`:''}</div>`}
function showTheory(st){''')

# ---------- 2b. Главная «Сегодня», таб-бар, экран «Уроки» ----------
a=s.index('function showHome(){');b=s.index('/* ---------- lesson intro ---------- */',a)
s=s[:a]+open(__file__.replace('apply.py','home.js')).read()+'\n'+s[b:]
# грамматика и три формы теперь живут в «Уроках»
i=s.index('function showGrammar(tab){');j=s.index("$('back').onclick=showHome;",i)
s=s[:i]+s[i:j].replace('${BACK_SVG}Главная</button>','${BACK_SVG}Уроки</button>')+"$('back').onclick=showLessons;"+s[j+len("$('back').onclick=showHome;"):]
i=s.index('function showVerbs(){');j=s.index("$('back').onclick=showHome;",i)
s=s[:i]+s[i:j].replace('${BACK_SVG}Главная</button>','${BACK_SVG}Уроки</button>')+"$('back').onclick=showLessons;"+s[j+len("$('back').onclick=showHome;"):]
rep("\nshowHome();\nconnect();\n","\ninitTabs();\nshowHome();\nconnect();\n")

# кнопка звуков ответов переехала с главной в «Итоги»
rep('<div class="shead"><h1>Итоги недели</h1><span>${rng}</span></div>','<div class="shead"><h1>Итоги недели</h1><span>${rng}</span>${sndToggle()}</div>')

# ---------- 3. Стили ----------
CSS=open(__file__.replace('apply.py','milk.css')).read()
i=s.rindex('\n<script>')
s=s[:i]+'\n<style>\n'+CSS+'</style>'+s[i:]
# обёртку страницы добавляет публикация: убираем ту, что пришла с чтением
m=re.match(r'<!doctype html><html><head>.*?</head><body>\n',s,re.S)
if m: s=s[m.end():]
s=re.sub(r'\s*</body></html>\s*$','\n',s)
open(dst,'w').write(s)
print('ok',len(s))
