/* ---------- v78: «Мозаика» — главная «Сегодня», таб-бар, экран «Уроки» ---------- */
const ICON_FLAME='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12.6 2.5c.6 3.3-1.2 4.8-2.7 6.500C8.3 10.8 7 12.6 7 15a5.5 5.5 0 0 0 11 0c0-2.2-1-3.8-2-5-.3 1.3-1 2.1-1.9 2.5.5-3.6-.3-7.6-1.5-10z" fill="#FF6B4A"/><path d="M12.3 12.500c.2 1.5-.8 2.2-1.4 3.1-.4.6-.6 1.2-.6 1.900a2.2 2.2 0 0 0 4.4 0c0-1.8-1.3-3-2.4-5z" fill="#FFB21E"/></svg>';
const ICON_SEND='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5M6 11l6-6 6 6"/></svg>';
const TAB_ICONS={
  home:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.6" fill="currentColor"/><g stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 2.800v2.400M12 18.800v2.400M2.8 12h2.400M18.8 12h2.400M5.5 5.500l1.7 1.700M16.8 16.800l1.7 1.700M5.5 18.500l1.7-1.700M16.8 7.200l1.7-1.7"/></g></svg>',
  lessons:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6.500C3 5.7 3.7 5 4.5 5H10c.6 0 1 .4 1 1v12.500c0 .3-.3.5-.6.400C9.6 18.6 8.8 18.5 8 18.500H4.500c-.8 0-1.5-.7-1.5-1.500zM21 6.500c0-.8-.7-1.5-1.5-1.500H14c-.6 0-1 .4-1 1v12.500c0 .3.3.5.6.4.8-.3 1.6-.4 2.4-.4h3.500c.8 0 1.5-.7 1.5-1.500z" fill="currentColor"/></svg>',
  vocab:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3.5" width="11" height="15" rx="2.5" transform="rotate(10 14.5 11)" fill="currentColor" opacity=".45"/><rect x="4.5" y="5" width="11" height="15" rx="2.5" transform="rotate(-8 10 12.5)" fill="currentColor"/></svg>',
  stats:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="11" width="4.4" height="9" rx="2.2" fill="currentColor"/><rect x="9.8" y="4" width="4.4" height="16" rx="2.2" fill="currentColor"/><rect x="15.6" y="8" width="4.4" height="12" rx="2.2" fill="currentColor"/></svg>'};
const TABS=[['home','Сегодня'],['lessons','Уроки'],['vocab','Слова'],['stats','Итоги']];
let tabsEl=null;
function tabKey(){return view==='home'?'home':view==='lessons'?'lessons':view==='vocab'&&VV==='home'?'vocab':view==='stats'?'stats':''}
function syncTabs(){
  if(!tabsEl)return;const k=tabKey();document.body.classList.toggle('tb',!!k);tabsEl.hidden=!k;if(!k)return;
  tabsEl.innerHTML=`<div class="in">${TABS.map(([t,n])=>`<button data-t="${t}"${t===k?' aria-current="page"':''}>${TAB_ICONS[t]}<span>${n}</span></button>`).join('')}</div>`;
}
function initTabs(){
  tabsEl=document.createElement('nav');tabsEl.id='tabs';tabsEl.hidden=true;tabsEl.setAttribute('aria-label','Разделы');document.body.appendChild(tabsEl);
  tabsEl.onclick=e=>{const b=e.target.closest('button');if(!b||b.hasAttribute('aria-current'))return;
    ({home:showHome,lessons:showLessons,vocab:()=>{VV='home';VQ='';showVocab();window.scrollTo(0,0)},stats:showStats})[b.dataset.t]()};
  new MutationObserver(syncTabs).observe(app,{childList:true});
}
/* плитка урока красится по виду урока, текст тёмный */
const KIND_TILE={gram:['#FFD66B','#E0A92B','#2B2440'],tutor:['#FFC98A','#E59A45','#2B2440'],read:['#A9E8DC','#62C6B5','#12443C'],hear:['#BBD6FA','#7FA9E6','#1D3460'],life:['#FFC9DF','#F09CC2','#7A1848']};
const CHECK_SVG='<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 10.500l4 4 8-9"/></svg>';
function planRow(s,i){
  const l=s.k==='lesson'?(s.done?findLesson((lessonDoneToday()||{}).lesson):(quickLong()||{}).l):null;
  if(s.done)return `<button class="mrow ok" data-step="${i}"><i>${CHECK_SVG}</i><b>${esc(s.k==='lesson'?s.title:s.kick)}</b>${s.k==='lesson'&&s.sub?`<span>${esc(s.sub)}</span>`:''}</button>`;
  if(s.k==='lesson'){const K=KIND_TILE[l?lessonKind(l).k:'gram'],st=l&&l.stages[0];
    return `<button class="mles" data-step="${i}" style="--bg:${K[0]};--lip:${K[1]};--ink:${K[2]}"><small>${esc(s.kick)}</small><b>${esc(s.title)}</b><span class="lart">${st&&st.pic?ill(st.pic):mascot(s.shape,l?col(st.color):'#7444E6','happy',true)}</span><span class="go"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.5 5.500v13l11-6.500z" fill="currentColor"/></svg></span></button>`}
  const n=parseInt(s.title)||0;
  return `<button class="mrow" data-step="${i}"><b>${s.k==='words'?`<em>${n}</em> ${plural(n,'слово','слова','слов')}`:esc(s.kick)}</b>${s.k==='warm'?`<span>${esc(s.title)}</span>`:''}<i class="pic ${s.k}"></i></button>`;
}
function planList(){
  if(!S.lessons)return `<div class="skel" style="height:300px;border-radius:32px"></div>`;
  const st=planSteps();if(!st.length)return '';
  const allDone=st.every(s=>s.done),f=allDone&&focusLesson(true),rec=allDone?(f?{l:f.l}:recommend()):null;
  return `<div class="mplan">${st.map(planRow).join('')}${rec?`<button class="press" id="pmore" style="--c:${lessonKind(rec.l).c}"><span>Ещё урок</span><b>${esc(rec.l.title)}</b></button>`:''}${moreReview(allDone)}</div>`;
}
function gamesTiles(){
  if(!S.lessons)return '';const w=wordleState(),pb=pairsBest();
  const cells=w.done&&w.g.length?[...String(w.g[w.g.length-1].w||w.g[w.g.length-1]||'').toUpperCase()].slice(0,5):['','','','',''];
  return `<button class="mgame wd" id="go-wordle"><b>Слово дня</b><span class="cells">${cells.map(c=>`<i class="${c?(w.won?'g':'n'):''}">${esc(c)}</i>`).join('')}</span></button>
    <button class="mgame pr" id="go-pairs"><b>Пары</b>${pb.n?`<span class="rec"><em>${pb.n}</em> за минуту</span>`:''}<span class="pc2" aria-hidden="true"><i></i><i></i></span></button>`;
}
function showHome(){
  view='home';lesson=null;stopTimers();clearInterval(clockTimer);dock('');document.body.classList.remove('sea');
  const ALL=S.lessons,BIG=ALL?ALL.filter(l=>isBig(l)&&!isSerial(l)):[],L=ALL?ALL.filter(l=>!isBig(l)):null,P=S.progress,H=P.history||[];
  const hr=new Date().getHours(),back=H.length&&quickGap()>=3;
  const greet=back?'Willkommen zurück':hr<5?'Guten Abend':hr<11?'Guten Morgen':hr<18?'Guten Tag':'Guten Abend';
  const days=new Set(H.map(h=>dayKey(h.t))).size;
  const empty=L&&!L.length&&!BIG.length?`<div class="card empty">${mascot('cloud','blue','wow',true)}<p>Уроков пока нет. Напиши Claude, какую тему хочешь потренировать, и урок появится здесь.</p></div>`:'';
  app.innerHTML=`
    <div class="mtop"><span class="mlogo">${mascot('flower','violet','happy')}</span><h1>${greet}, Alina</h1>
      <span class="tbr">${S.synced?'':`<span class="pill"><i></i>${S.db?'Подключаюсь':'Только это устройство'}</span>`}<button class="mdays" id="go-stats" aria-label="Дней занятий: ${days}">${ICON_FLAME}<b>${days}</b></button></span></div>
    <div class="hgrid"><div class="hcol hcl">
      <form class="msay" id="hsay"><input id="hq" type="text" enterkeyhint="search" placeholder="Как сказать…" aria-label="Как сказать: слово, фраза или вопрос" autocomplete="off" autocapitalize="off" spellcheck="false"><button type="submit" aria-label="Спросить">${ICON_SEND}</button></form>
      ${planList()}${empty}
    </div><div class="hcol hr">
      ${S.lessons?`<div class="section"><h3>Пять минут</h3></div><div class="mgames">${gamesTiles()}</div>`:''}
      ${BIG.length?`<div class="section"><h3>${BIG.length>1?'Большие уроки':'Большой урок'}</h3></div><div class="bigs">${BIG.map(bigRow).join('')}</div>`:''}
    </div></div>`;
  app.querySelectorAll('.bigrow').forEach(b=>b.onclick=()=>showBig(S.lessons.find(l=>l.id===b.dataset.big)));
  $('go-stats').onclick=showStats;
  $('hsay').onsubmit=e=>{e.preventDefault();const q=$('hq').value.trim();if(q.length<2)return showSay();sayRun(q)};
  if($('go-review'))$('go-review').onclick=()=>startReview(dueCards(15),{title:'Повторение'});
  const st=S.lessons?planSteps():[];
  app.querySelectorAll('.mplan [data-step]').forEach(b=>b.onclick=()=>{const s=st[+b.dataset.step];if(s&&!(s.done&&s.k!=='lesson'))s.go()});
  if($('pmore'))$('pmore').onclick=()=>{const f=focusLesson(true),r=f?{l:f.l}:recommend();if(r)showIntro(r.l)};
  window.scrollTo(0,0);
}
/* «Уроки»: новые, повторить кружками, сериал, грамматика и три формы, большие уроки */
function showLessons(){
  view='lessons';lesson=null;stopTimers();clearInterval(clockTimer);dock('');document.body.classList.remove('sea');
  const ALL=S.lessons||[],BIG=ALL.filter(l=>isBig(l)&&!isSerial(l)),SER=ALL.filter(isSerial),L=ALL.filter(l=>!isBig(l)),P=S.progress;
  const newL=L.filter(l=>!P.lessons[l.id]),doneL=L.filter(l=>P.lessons[l.id]).sort((a,b)=>P.lessons[a.id].last.pct-P.lessons[b.id].last.pct||P.lessons[a.id].last.t-P.lessons[b.id].last.t);
  const rep=l=>{const c=lessonKind(l).c;return `<button class="mrep" data-id="${esc(l.id)}">${ring(P.lessons[l.id].last.pct,c,64)}<b>${esc(l.title)}</b></button>`};
  const tiles=[gramEntry(),verbTile()].filter(Boolean).join('');
  app.innerHTML=`<div class="mhead"><h1>Уроки</h1></div>
    ${S.lessons?'':'<div class="skel"></div>'}
    ${newL.length?`<div class="section"><h3>Новые</h3></div><div class="shelf">${newL.map(ltile).join('')}</div>`:''}
    ${doneL.length?`<div class="section"><h3>Повторить</h3></div><div class="shelf mreps">${doneL.map(rep).join('')}</div>`:''}
    ${SER.length?`<div class="section"><h3>Чтение</h3></div>${SER.map(serialRow).join('')}`:''}
    ${tiles?`<div class="section"><h3>Грамматика</h3></div><div class="sduo">${tiles}</div>`:''}
    ${BIG.length?`<div class="section"><h3>${BIG.length>1?'Большие уроки':'Большой урок'}</h3></div><div class="bigs">${BIG.map(bigRow).join('')}</div>`:''}`;
  app.querySelectorAll('.ltile,.mrep').forEach(b=>b.onclick=()=>showIntro(S.lessons.find(l=>l.id===b.dataset.id)));
  app.querySelectorAll('.bigrow').forEach(b=>b.onclick=()=>showBig(S.lessons.find(l=>l.id===b.dataset.big)));
  app.querySelectorAll('.serow').forEach(b=>b.onclick=()=>{const l=S.lessons.find(x=>x.id===b.dataset.ser),s=l&&bigState(l);if(s&&s.cur)showIntro(chapterLesson(l,s.cur.i));else showSerial(l)});
  if($('go-gram'))$('go-gram').onclick=()=>showGrammar();if($('go-verbs'))$('go-verbs').onclick=showVerbs;
  window.scrollTo(0,0);
}
