# ---------- 2f. «Грамматика»: простой список тем A1/A2, конспект темы одним листом, упражнения ----------
import re
LIST=r"""function gqMark(t){
  if(t.st==='planned')return `<i class="gqc">${CHEV}</i>`;
  if(t.st==='solid'||(t.st==='new'&&t.tut))return '<i class="gqk"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 10.5l3.6 3.6 7.4-8.2"/></svg></i>';
  const col=t.st==='stuck'?'#FF6FA8':t.st==='learning'?'#16BFA6':'#FFB21E',pool=gPool(t).length,err=gErrCards(t).length;
  const p=Math.max(20,Math.min(80,pool?Math.round((1-err/pool)*100):45));
  return `<i class="gqr" style="background:conic-gradient(${col} ${p}%,#EFE9DF 0)"></i>`;
}
let GLV='A1';try{GLV=localStorage.getItem('md-glv')||'A1'}catch(e){}
function showGrammar(lv){
  if(lv==='A1'||lv==='A2')GLV=lv;
  view='grammar';lesson=null;stopTimers();clearInterval(clockTimer);dock('');document.body.classList.remove('sea');hidePop();
  const T=gTopics(),L=T.filter(t=>t.lv===GLV),ord={solid:0,new:1,learning:2,stuck:2,planned:3};
  const R=L.map((t,i)=>({t,i,o:t.st==='new'&&!t.tut?2:ord[t.st]})).sort((a,b)=>a.o-b.o||a.i-b.i).map(x=>x.t);
  app.innerHTML=`<div class="stop"><button class="x" id="gback" aria-label="Назад">${BACK_SVG}</button><h1>Грамматика</h1></div>
   ${T.length?`<div class="mpills gqp" role="tablist">${['A1','A2'].map(k=>`<button role="tab" aria-selected="${GLV===k}" data-lv="${k}">${k}</button>`).join('')}</div>
   <div class="gql">${R.map(t=>`<button class="gqrow" data-g="${esc(t.id)}"><b>${esc(t.ru)}</b>${gqMark(t)}</button>`).join('')}</div>`
   :`<div class="card empty">${mascot('cloud','blue','wow',true)}<p>Список тем ещё загружается. Он появится после синхронизации.</p></div>`}`;
  $('gback').onclick=showLessons;
  app.querySelectorAll('.gqp button').forEach(b=>b.onclick=()=>{try{localStorage.setItem('md-glv',b.dataset.lv)}catch(e){}showGrammar(b.dataset.lv)});
  app.querySelectorAll('[data-g]').forEach(b=>b.onclick=()=>showGTopic(gFind(b.dataset.g)));
  window.scrollTo(0,0);
}
"""
TOPIC=r"""function gqEx(ex,f){return (ex||[]).map(x=>`<div class="gqex" lang="de"><div>${f(x[0])}</div>${x[1]?`<span lang="ru">${esc(x[1])}</span>`:''}</div>`).join('')}
function showGTopic(t){
  if(!t)return showGrammar();
  view='gtopic';lesson=null;stopTimers();clearInterval(clockTimer);dock('');document.body.classList.remove('sea');hidePop();
  const n=t.st==='planned'?0:gDrillN(t),seenT=new Set(),TH=gTheories(t).filter(T=>{const k=String(T.t).toLowerCase();if(seenT.has(k))return false;seenT.add(k);return true}).slice(0,5),P=S.progress.lessons;
  const L=[...new Set((t.stg||[]).map(k=>k.split('|')[0]))].map(id=>findLesson(id)).filter(Boolean);
  const S2=[...(t.kids||[]).map(k=>({h:k.ru,b:k.rule?`<p>${esc(k.rule)}</p>`:''})),...TH.map(T=>({h:T.t,b:(T.p||[]).map(x=>`<p>${rich(x)}</p>`).join('')+(T.tab?gTab(T.tab):'')+gqEx(T.ex,rich)}))];
  app.innerHTML=`<div class="stop"><button class="x" id="gback" aria-label="Назад">${BACK_SVG}</button><h1>${esc(t.ru)}</h1></div>
   <div class="gqs">${t.rule?`<p class="gqlead">${esc(t.rule)}</p>`:''}${gqEx(t.ex,esc)}
     ${S2.map((x,i)=>`<section><h3><i>${i+1}</i>${esc(x.h)}</h3>${x.b}</section>`).join('')}
     ${!t.rule&&!S2.length?'<p class="gqlead">Конспект этой темы появится, когда вы начнёте её с репетитором.</p>':''}</div>
   ${n?`<button class="press gqgo" id="gqgo">Упражнения</button>`:''}
   ${L.length?`<h3 class="msec s">Уроки по теме</h3><div class="gql">${L.map(l=>`<button class="gqrow" data-l="${esc(l.id)}"><b>${esc(l.parent?l.parent.title+' · '+l.title:l.title)}</b>${P[l.id]?'<i class="gqk"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 10.5l3.6 3.6 7.4-8.2"/></svg></i>':`<i class="gqc">${CHEV}</i>`}</button>`).join('')}</div>`:''}`;
  $('gback').onclick=()=>showGrammar();
  if($('gqgo'))$('gqgo').onclick=()=>startGram(t,()=>showGTopic(gFind(t.id)||t));
  app.querySelectorAll('[data-l]').forEach(b=>b.onclick=()=>showIntro(findLesson(b.dataset.l)));
  window.scrollTo(0,0);
}
"""
def _swap(s,M,new):
    i=s.index(M);assert s.count(M)==1,M
    m=re.compile(r'^\}\n',re.M).search(s,i)
    return s[:i]+new+s[m.end():]
def patch(s):
    s=_swap(s,'function showGrammar(tab){',LIST)
    s=_swap(s,'function showGTopic(t){',TOPIC)
    return s
