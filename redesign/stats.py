# ---------- 2e. «Итоги»: неделя в минутах активного времени, «Знаю слов», «Цель»; счётчик времени ----------
TRACK=r"""
/* ---------- v81: активное время. Секунды по дням в S.progress.mins; идёт, пока вкладка видна и было касание за последнюю минуту ---------- */
const dnum=t=>Math.floor((t-new Date(t).getTimezoneOffset()*60000)/DAY);
let ACT_T=0,ACT_N=0;
['pointerdown','keydown'].forEach(ev=>document.addEventListener(ev,()=>{ACT_T=Date.now()},{passive:true}));
setInterval(()=>{if(document.hidden||!S.progress||!S.progRef||Date.now()-ACT_T>60000)return;
  const M=S.progress.mins||(S.progress.mins={}),d=today();M[d]=(M[d]||0)+10;if(++ACT_N%6===0)persist()},10000);
/* минуты за день: измеренные, а для дней до счётчика оценка по числу заданий */
function dayMins(d0){const M=(S.progress&&S.progress.mins)||{},d=dnum(d0);if(M[d])return Math.max(1,Math.round(M[d]/60));
  const n=(S.progress.history||[]).filter(h=>h.t>=d0&&h.t<d0+DAY).reduce((s,h)=>s+(h.total||0),0);return n?Math.max(1,Math.round(n*0.35)):0}
function weekMins(off=0){const [a]=weekBounds(off),per=[0,1,2,3,4,5,6].map(i=>dayMins(a+i*DAY));return {per,sum:per.reduce((s,x)=>s+x,0),days:per.filter(Boolean).length}}
"""
def patch(s):
    M='function showStats(){';i=s.index(M);s=s[:i]+TRACK+s[i:]
    i=s.index(M)
    a=s.index('   <button class="back" id="back">${BACK_SVG}Главная</button>\n   <div class="sgrid"><div class="scol">',i);b=s.index('   <div class="card epath">',a)
    new=r"""   <div class="shead"><h1 class="mh1">Итоги</h1>${sndToggle()}</div>
   <div class="sgrid"><div class="scol">
   <div class="swk"><div class="swkl"><small>Эта неделя</small><b>${WM.sum}</b><span>${plural(WM.sum,'минута','минуты','минут')}${WM.days?`<br>за ${WM.days} ${plural(WM.days,'день','дня','дней')}`:''}</span>${PM.sum&&WM.sum>PM.sum?`<em>+${WM.sum-PM.sum} к прошлой</em>`:''}</div>
     <div class="swb">${WM.per.map((n,k)=>`<div class="${k===dow?'td':''}"><i><u style="height:${n?Math.max(10,Math.round(n/Math.max(1,...WM.per)*100)):0}%"></u></i><small>${names[k]}</small></div>`).join('')}</div></div>
   <div class="sduo2"><div class="skn"><small>Знаю слов</small><b>${knownWordsAt().length}</b></div>
     ${todo[0]?`<div class="sgl"><small>Цель</small><b>${esc(goalTitle(todo[0]))}</b>${ring(Math.round(todo[0].have/todo[0].need*100),'#7444E6')}</div>`:''}</div>
   ${wr?wrCard(wr):''}
"""
    s=s[:a]+new+s[b:]
    x="  app.innerHTML=`\n   <div class=\"shead\"><h1 class=\"mh1\">Итоги</h1>"
    assert s.count(x)==1;s=s.replace(x,"  const WM=weekMins(),PM=weekMins(1);\n"+x)
    j=s.index("  $('back').onclick=showHome;",s.index(M));s=s[:j]+s[j+len("  $('back').onclick=showHome;"):]
    return s
