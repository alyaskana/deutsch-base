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
NEW=r"""function weekRoll(off=0){const d=new Date();d.setHours(0,0,0,0);const t0=d.getTime()-off*7*DAY,nm=['Вс','Пн','Вт','Ср','Чт','Пт','Сб'];
  const days=[6,5,4,3,2,1,0].map(k=>{const t=t0-k*DAY;return {t,m:dayMins(t),n:nm[new Date(t).getDay()]}});
  return {days,sum:days.reduce((s,x)=>s+x.m,0),act:days.filter(x=>x.m).length}}
function showStats(){
  view='stats';lesson=null;stopTimers();clearInterval(clockTimer);dock('');document.body.classList.remove('sea');
  const W=weekRoll(),PW=weekRoll(1),mx=Math.max(1,...W.days.map(x=>x.m)),A=achList(),seen=new Set();
  const todo=A.filter(x=>!x.done).filter(x=>{const g=x.id.replace(/\d+$/,'');if(seen.has(g))return false;seen.add(g);return true}).sort((a,b)=>b.have/b.need-a.have/a.need),g=todo[0];
  const kn=knownWordsAt().length,wr=wrFresh();
  app.innerHTML=`<div class="shead"><h1 class="mh1">Итоги</h1>${sndToggle()}</div>
   <div class="swk"><div class="swkl"><small>Эта неделя</small><b>${W.sum}</b><span>${plural(W.sum,'минута','минуты','минут')}${W.act?`<br>за ${W.act} ${plural(W.act,'день','дня','дней')}`:''}</span>${PW.sum&&W.sum>PW.sum?`<em>↑ +${W.sum-PW.sum} к прошлой</em>`:''}</div>
     <div class="swb">${W.days.map((x,k)=>`<div class="${k===6?'td':''}"><i><u style="height:${x.m?Math.max(10,Math.round(x.m/mx*100)):0}%"></u></i><small>${x.n}</small></div>`).join('')}</div></div>
   <div class="sduo2"><div class="skn"><small>Знаю слов</small><b>${kn}</b><span class="dots" aria-hidden="true">${[[4,1],[2,2],[3,2],[4,2],[1,3],[2,3],[3,3],[4,3]].map(([c,r],i)=>`<i class="${r===3&&c<4?'on':''}" style="grid-column:${c};grid-row:${r}"></i>`).join('')}</span></div>
     ${g?`<button class="sgl" id="go-goals"><small>Цель</small><b>${esc(goalTitle(g))}</b>${ring(Math.round(g.have/g.need*100),'#7444E6')}</button>`:`<button class="sgl" id="go-goals"><small>Цели</small><b>Все отметки пройдены</b></button>`}</div>
   <button class="swr" id="go-week"><b>Обзор недели</b><span class="mm">${mascot('flower','#ffffff','happy')}</span></button>`;
  $('go-goals').onclick=showGoals;$('go-week').onclick=showWeek;
  if(wr&&S.progress.wrSeen!==wr.week){S.progress.wrSeen=wr.week;try{persist()}catch(e){}}
  window.scrollTo(0,0);
}
/* «Обзор недели»: главное одной фразой, три числа, на чём сосредоточиться, что спрашивала не один раз */
function showWeek(){
  view='week';lesson=null;stopTimers();clearInterval(clockTimer);dock('');
  const W=weekRoll(),t0=W.days[0].t,H=S.progress.history||[],wr=wrFresh(),AR=askRepeats();
  const first={};H.forEach(h=>{if(h.lesson&&!['review','drill','gram'].includes(h.lesson)&&(!(h.lesson in first)||h.t<first[h.lesson]))first[h.lesson]=h.t});
  const newL=Object.values(first).filter(t=>t>=t0).length,words=knownWordsAt().filter(t=>t>=t0).length;
  const E=errCards(),sk={};E.forEach(c=>{if(c.box>=3)return;const k=c.skill||'Разное';(sk[k]=sk[k]||[]).push(c)});
  const weak=Object.entries(sk).map(([k,v])=>({k,v,n:v.reduce((s,c)=>s+(c.lapses||1),0)})).sort((a,b)=>b.n-a.n).slice(0,3);
  const F=wr?(wr.focus||[]).slice(0,3).map(f=>({f,a:findAction(f.action)})).filter(x=>x.a):[];
  const head=wr&&wr.headline?wr.headline:W.act?`На этой неделе ты занималась ${W.act} ${plural(W.act,'день','дня','дней')}`:'Неделя только начинается';
  app.innerHTML=`<div class="stop"><button class="x" id="wback" aria-label="Назад">${BACK_SVG}</button><h1>Обзор недели</h1></div>
   <div class="swr big"><b>${esc(head)}</b><span class="mm">${mascot('flower','#ffffff','happy')}</span></div>
   <div class="wk3"><div class="a"><b>${W.act}</b><span>${plural(W.act,'день','дня','дней')}<br>занятий</span></div><div class="b"><b>${newL}</b><span>${plural(newL,'новый урок','новых урока','новых уроков').replace(' ','<br>')}</span></div><div class="c"><b>${words}</b><span>${plural(words,'новое слово','новых слова','новых слов').replace(' ','<br>')}</span></div></div>
   ${F.length||weak.length?`<h3 class="msec">На чём сосредоточиться</h3><div class="wfoc">${F.map((x,i)=>x.a.type==='trainer'?`<a class="wf${i%2?' pk':''}" href="${x.a.t.u}" target="_blank" rel="noopener"><b>${esc(x.f.title)}</b><em>Играть</em></a>`:`<button class="wf${i%2?' pk':''}" data-f="${i}"><b>${esc(x.f.title)}</b><em>Начать</em></button>`).join('')}${weak.map((x,i)=>`<button class="wf${(F.length+i)%2?' pk':''}" data-w="${i}"><b>${esc(x.k)}</b><em>Тренировать</em></button>`).join('')}</div>`:''}
   ${AR.length?`<h3 class="msec">Спрашивала не один раз</h3><div class="wask">${AR.map((h,i)=>`<div><span>${esc(h.ru||h.q)}</span><b>${esc(h.de)}</b><button data-a="${i}" aria-label="Добавить в словарик: ${esc(h.de)}">+</button></div>`).join('')}</div>`:''}`;
  $('wback').onclick=showStats;
  app.querySelectorAll('.wf[data-f]').forEach(b=>b.onclick=()=>{const a=F[+b.dataset.f].a;a.type==='big'?showBig(a.l):showIntro(a.l)});
  app.querySelectorAll('.wf[data-w]').forEach(b=>b.onclick=()=>{const x=weak[+b.dataset.w];startReview(shuffle(x.v).slice(0,10),{title:x.k,back:showWeek})});
  app.querySelectorAll('.wask button').forEach(b=>b.onclick=()=>{const h=AR[+b.dataset.a];if(saveVocab(h.de,h.ru||'','Как сказать',h.ex||'',true)!==false){b.textContent='✓';b.disabled=true}});
  window.scrollTo(0,0);
}
/* «Цели»: ближайшие отметки полосками и то, что уже получилось */
function showGoals(){
  view='goals';lesson=null;stopTimers();clearInterval(clockTimer);dock('');
  const A=achList(),seen=new Set(),got=A.filter(x=>x.done).sort((a,b)=>(b.at||0)-(a.at||0));
  const todo=A.filter(x=>!x.done).filter(x=>{const g=x.id.replace(/\d+$/,'');if(seen.has(g))return false;seen.add(g);return true}).sort((a,b)=>b.have/b.need-a.have/a.need).slice(0,3);
  app.innerHTML=`<div class="stop"><button class="x" id="gback" aria-label="Назад">${BACK_SVG}</button><h1>Цели</h1></div>
   <div class="glist">${todo.map((x,i)=>{const a=goalAct(x),tag=a?'button':'div';return `<${tag} class="gnl g${i%3}"${a?` data-g="${esc(a.k)}"`:''}><span class="gh"><b>${esc(goalTitle(x))}</b><em>${x.have}<small> / ${x.need}</small></em></span><span class="gb"><i style="width:${Math.round(x.have/x.need*100)}%"></i></span></${tag}>`}).join('')}</div>
   ${got.length?`<h3 class="msec">Уже получилось</h3><div class="ggot">${got.map(x=>`<div>${achBadge(x,true)}<b>${esc(x.title)}</b></div>`).join('')}</div>`:''}`;
  $('gback').onclick=showStats;
  app.querySelectorAll('.gnl[data-g]').forEach(b=>b.onclick=()=>goalGo(b.dataset.g));
  window.scrollTo(0,0);
}
"""
import re
def patch(s):
    M='function showStats(){';i=s.index(M)
    m=re.compile(r'^\}\n',re.M).search(s,i);j=m.end()
    s=s[:i]+TRACK.lstrip('\n')+NEW+s[j:]
    assert s.count('back:showStats')>=1
    return s
