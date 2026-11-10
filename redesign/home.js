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
function tabKey(){return view==='home'?'home':view==='lessons'?'lessons':view==='vocab'?'vocab':['stats','week','goals'].includes(view)?'stats':''}
function syncTabs(){
  if(!tabsEl)return;const k=tabKey();document.body.classList.toggle('tb',!!k);tabsEl.hidden=!k;if(!k)return;
  tabsEl.innerHTML=`<div class="in">${TABS.map(([t,n])=>`<button data-t="${t}"${t===k?' aria-current="page"':''}>${TAB_ICONS[t]}<span>${n}</span></button>`).join('')}</div>`;
}
function initTabs(){
  tabsEl=document.createElement('nav');tabsEl.id='tabs';tabsEl.hidden=true;tabsEl.setAttribute('aria-label','Разделы');document.body.appendChild(tabsEl);
  tabsEl.onclick=e=>{const b=e.target.closest('button');if(!b)return;
    ({home:showHome,lessons:showLessons,vocab:()=>{VV='home';VQ='';showVocab();window.scrollTo(0,0)},stats:showStats})[b.dataset.t]()};
  new MutationObserver(syncTabs).observe(app,{childList:true});
}
/* плитка урока красится по виду урока, текст тёмный */
const KIND_TILE={gram:['#FFD66B','#E0A92B','#2B2440'],tutor:['#FFC98A','#E59A45','#2B2440'],read:['#A9E8DC','#62C6B5','#12443C'],hear:['#BBD6FA','#7FA9E6','#1D3460'],life:['#FFC9DF','#F09CC2','#7A1848']};
const CHECK_SVG='<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 10.500l4 4 8-9"/></svg>';
function planRow(s,i){
  const l=s.k==='lesson'?(s.done?findLesson((lessonDoneToday()||{}).lesson):(quickLong()||{}).l):null;
  if(s.done)return `<button class="mrow ok" data-step="${i}"><i>${CHECK_SVG}</i><b>${esc(s.k==='lesson'?s.title:s.kick)}</b>${s.k==='lesson'&&s.sub?`<span>${esc(s.sub)}</span>`:''}</button>`;
  if(s.k==='lesson'){const K=l?TILE_PAL[tileIdx(l)]:TILE_PAL[0];
    return `<button class="mles" data-step="${i}" style="--bg:${K[0]};--lip:${K[1]};--ink:${K[2]}"><b>${esc(s.title)}</b><span class="lart">${l?lessonArt(l):''}</span><span class="go"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.5 5.500v13l11-6.500z" fill="currentColor"/></svg></span></button>`}
  const n=parseInt(s.title)||0;
  return `<button class="mrow" data-step="${i}"><b>${s.k==='words'?`<em>${n}</em> ${plural(n,'слово','слова','слов')}`:esc(s.kick)}</b>${s.k==='warm'?`<span>${esc(s.title)}</span>`:''}<i class="pic ${s.k}"></i></button>`;
}
/* большой урок плиткой-сценой: название, стрелка, полоска глав */
function mbig(l){
  const s=bigState(l),N=l.chapters.length,cur=s.cur?s.cur.i:-1;
  return `<button class="mbig" data-big="${esc(l.id)}"><svg viewBox="0 0 360 170" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="360" height="170" fill="#C9F1EA"/><circle cx="318" cy="40" r="20" fill="#FFB21E"/><path d="M0 96Q40 60 96 92T190 86V110H0z" fill="#B9A3F0"/><rect y="100" width="360" height="70" fill="#16BFA6"/><g fill="none" stroke="#7BE3D3" stroke-width="4" stroke-linecap="round"><path d="M110 152q10-8 20 0t20 0"/><path d="M250 138q10-8 20 0t20 0"/><path d="M300 112q8-6 16 0t16 0"/></g><g transform="translate(196 28)"><rect x="29" y="0" width="4" height="80" rx="2" fill="#3A2A6B"/><path d="M27 6L27 70L-6 70z" fill="#fff"/><path d="M36 2L36 70L78 70z" fill="#E8553D"/><path d="M-14 76H86q-8 22-30 22H12q-20 0-26-22z" fill="#7A4630"/><g fill="#FBE9C6"><circle cx="20" cy="86" r="3"/><circle cx="34" cy="86" r="3"/><circle cx="48" cy="86" r="3"/></g></g></svg>
    <b>${esc(l.title)}</b><span class="arr">${ICON_ARROW}</span><span class="segs" role="img" aria-label="Пройдено ${s.doneN} из ${N}">${l.chapters.map((c,i)=>`<i class="${i===cur?'cur':P_done(l,c)?'on':''}"></i>`).join('')}</span></button>`;
}
function P_done(big,c){return !!S.progress.lessons[chId(big,c)]}
const ICON_ARROW='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
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
      ${BIG.length?`<div class="section"><h3>${BIG.length>1?'Большие уроки':'Большой урок'}</h3></div><div class="bigs">${BIG.map(mbig).join('')}</div>`:''}
    </div></div>`;
  app.querySelectorAll('.mbig').forEach(b=>b.onclick=()=>showBig(S.lessons.find(l=>l.id===b.dataset.big)));
  $('go-stats').onclick=showStats;
  $('hsay').onsubmit=e=>{e.preventDefault();const q=$('hq').value.trim();if(q.length<2)return showSay();sayRun(q)};
  if($('go-review'))$('go-review').onclick=()=>startReview(dueCards(15),{title:'Повторение'});
  const st=S.lessons?planSteps():[];
  app.querySelectorAll('.mplan [data-step]').forEach(b=>b.onclick=()=>{const s=st[+b.dataset.step];if(s&&!(s.done&&s.k!=='lesson'))s.go()});
  if($('pmore'))$('pmore').onclick=()=>{const f=focusLesson(true),r=f?{l:f.l}:recommend();if(r)showIntro(r.l)};
  window.scrollTo(0,0);
}
/* «Уроки»: вкладки Новые / Повторить / Все, мозаика плиток с картинками, «По видам», повторить кружками */
let LTAB='new';
const KIND_ICON={
  gram:'<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="6" y="6" width="16" height="16" rx="5" fill="#7444E6"/><rect x="26" y="6" width="16" height="16" rx="5" fill="#FFCB45"/><rect x="6" y="26" width="16" height="16" rx="5" fill="#16BFA6"/><rect x="26" y="26" width="16" height="16" rx="5" fill="#FF77B4"/></svg>',
  read:'<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M6 10q9-4 18 2v28q-9-6-18-2z" fill="#8FD0F7"/><path d="M42 10q-9-4-18 2v28q9-6 18-2z" fill="#4DB6F2"/></svg>',
  hear:'<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M8 28v-4a16 16 0 0 1 32 0v4" fill="none" stroke="#3A2A6B" stroke-width="4" stroke-linecap="round"/><rect x="5" y="26" width="10" height="16" rx="5" fill="#16BFA6"/><rect x="33" y="26" width="10" height="16" rx="5" fill="#16BFA6"/></svg>',
  write:'<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="8" y="6" width="28" height="36" rx="6" fill="#FFE08A"/><path d="M14 16h16M14 24h16M14 32h9" stroke="#C27B0C" stroke-width="3" stroke-linecap="round"/><path d="M30 40l12-14l4 4l-12 14l-6 2z" fill="#E8553D"/></svg>',
  talk:'<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M6 12a6 6 0 0 1 6-6h18a6 6 0 0 1 6 6v10a6 6 0 0 1-6 6h-12l-8 7v-7a6 6 0 0 1-4-6z" fill="#FF77B4"/><path d="M22 32h14a6 6 0 0 0 6-6v-6" fill="none" stroke="#B02A70" stroke-width="4" stroke-linecap="round"/></svg>',
  story:'<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="22" y="4" width="3" height="30" rx="1.500" fill="#3A2A6B"/><path d="M20 8v24h-14z" fill="#B79CF6"/><path d="M27 6v26h16z" fill="#E8553D"/><path d="M4 36h40q-4 9-13 9h-14q-9 0-13-9z" fill="#7A4630"/></svg>'};
const KIND_NAME={gram:'Грамматика',read:'Чтение',hear:'На слух',write:'Письмо',talk:'Разговор',story:'Истории'};
function lessonCats(l){const has=t=>l.stages.some(s=>s.type===t),k=lessonKind(l).k,o=[];
  if(k==='hear'||has('listen'))o.push('hear');if(k==='read'||has('read'))o.push('read');if(has('write'))o.push('write');if(has('chat')||has('scene'))o.push('talk');if(k==='gram'||k==='tutor')o.push('gram');return o}
const TILE_PAL=[['#FFE08A','#D9A52A','#2B2440'],['#8FD0F7','#5FAEDD','#1F1640'],['#FFC9DF','#F09CC2','#7A1848'],['#A9E8DC','#62C6B5','#12443C'],['#FFC98A','#E59A45','#2B2440']];
function tileIdx(l){let x=0;for(const c of String(l.id||l.title))x=(x*31+c.charCodeAt(0))%9973;return x%TILE_PAL.length}
function kindTile(l,k){const K=TILE_PAL[k==null?tileIdx(l):k];return `--bg:${K[0]};--lip:${K[1]};--ink:${K[2]}`}
function mosaic(list){
  let prev=-1;
  return `<div class="mmos">${list.map((l,i)=>{const wide=i%3===0||(i===list.length-1&&i%3===1);let k=tileIdx(l);if(k===prev)k=(k+1)%TILE_PAL.length;prev=k;
    return `<button class="mt${wide?' wide':''}" data-id="${esc(l.id)}" style="${kindTile(l,k)}"><b>${esc(l.title)}</b>${lessonArt(l)}</button>`}).join('')}</div>`;
}
function kcard(l,sub,done){return `<button class="kcard" data-id="${esc(l.id)}"><span class="ka" style="${kindTile(l)}">${lessonArt(l)}${done?`<i>${CHECK_SVG}</i>`:''}</span><b>${esc(l.title)}</b>${sub?`<small>${esc(sub)}</small>`:''}</button>`}
function showLessons(){
  view='lessons';lesson=null;stopTimers();clearInterval(clockTimer);dock('');document.body.classList.remove('sea');
  const ALL=S.lessons||[],BIG=ALL.filter(l=>isBig(l)&&!isSerial(l)),SER=ALL.filter(isSerial),L=ALL.filter(l=>!isBig(l)),P=S.progress;
  const newL=L.filter(l=>!P.lessons[l.id]),doneL=L.filter(l=>P.lessons[l.id]).sort((a,b)=>P.lessons[a.id].last.pct-P.lessons[b.id].last.pct||P.lessons[a.id].last.t-P.lessons[b.id].last.t);
  if(LTAB==='new'&&!newL.length)LTAB=doneL.length?'rep':'all';
  const rep=l=>`<button class="mrep" data-id="${esc(l.id)}">${ring(P.lessons[l.id].last.pct,lessonKind(l).c,64)}<b>${esc(l.title)}</b></button>`;
  const serN=SER.reduce((s,l)=>s+l.chapters.length,0),cnt=k=>L.filter(l=>lessonCats(l).includes(k)).length;
  const gT=typeof gTopics==='function'?gTopics().length:0;
  const kinds=[['gram',gT,['тема','темы','тем']],['read',cnt('read')+serN,['текст','текста','текстов']],['hear',cnt('hear'),['диалог','диалога','диалогов']],['write',cnt('write'),['задание','задания','заданий']],['talk',cnt('talk'),['сценка','сценки','сценок']],['story',BIG.length,['история','истории','историй']]].filter(x=>x[1]);
  app.innerHTML=`<h1 class="mh1">Уроки</h1>
    ${S.lessons?'':'<div class="skel"></div>'}
    <div class="mpills" role="tablist">${[['new',`Новые · ${newL.length}`,newL.length],['rep',`Повторить · ${doneL.length}`,doneL.length],['all','Все',L.length]].filter(x=>x[2]).map(([k,t])=>`<button role="tab" aria-selected="${LTAB===k}" data-lt="${k}">${t}</button>`).join('')}</div>
    ${LTAB==='new'?mosaic(newL):LTAB==='all'?mosaic(L):`<div class="mreps grid">${doneL.map(rep).join('')}</div>`}
    ${kinds.length?`<h3 class="msec">По видам</h3><div class="mkinds">${kinds.map(([k,n,w])=>`<button data-kind="${k}">${KIND_ICON[k]}<span><b>${KIND_NAME[k]}</b><small>${n} ${plural(n,...w)}</small></span></button>`).join('')}</div>`:''}
    ${typeof VF_V!=='undefined'&&VF_V.length?`<div class="vlns" style="margin-top:10px"><button class="vln" id="go-verbs"><b>Три формы глаголов</b><em>${VF_V.length}</em>${CHEV}</button></div>`:''}
    ${LTAB!=='rep'&&doneL.length?`<h3 class="msec">Повторить</h3><div class="shelf mreps">${doneL.map(rep).join('')}</div>`:''}`;
  app.querySelectorAll('[data-lt]').forEach(b=>b.onclick=()=>{LTAB=b.dataset.lt;showLessons()});
  app.querySelectorAll('.mt,.mrep').forEach(b=>b.onclick=()=>showIntro(S.lessons.find(l=>l.id===b.dataset.id)));
  if($('go-verbs'))$('go-verbs').onclick=showVerbs;
  app.querySelectorAll('[data-kind]').forEach(b=>b.onclick=()=>b.dataset.kind==='gram'?showGrammar():showKind(b.dataset.kind));
  window.scrollTo(0,0);
}
/* один вид уроков: карточки с картинками; у чтения сначала серии сериала */
function showKind(k){
  view='lessons';lesson=null;stopTimers();clearInterval(clockTimer);dock('');document.body.classList.remove('sea');
  const ALL=S.lessons||[],BIG=ALL.filter(l=>isBig(l)&&!isSerial(l)),SER=k==='read'?ALL.filter(isSerial):[],L=ALL.filter(l=>!isBig(l)&&lessonCats(l).includes(k)),P=S.progress;
  const sub=l=>{const t=String(l.topic||'').split('·').pop().trim();return t.length<=22?t:''};
  app.innerHTML=`<div class="stop"><button class="x" id="kback" aria-label="Назад">${BACK_SVG}</button><h1>${KIND_NAME[k]}</h1></div>
    ${SER.map(s=>`<h3 class="msec">Сериал «${esc(s.title)}»</h3><div class="shelf kshelf">${s.chapters.map((c,i)=>kcard({...chapterLesson(s,i),serial:true},`Серия ${c.ep||i+1}`,P_done(s,c)).replace('data-id=',`data-ser="${esc(s.id)}" data-ch="${i}" data-x=`)).join('')}</div>`).join('')}
    ${k==='story'?`<div class="bigs">${BIG.map(mbig).join('')}</div>`:''}
    ${L.length?`${SER.length?'<h3 class="msec">Истории</h3>':''}<div class="kgrid">${L.map(l=>kcard(l,sub(l),!!P.lessons[l.id])).join('')}</div>`:''}`;
  $('kback').onclick=showLessons;
  app.querySelectorAll('.kcard[data-id]').forEach(b=>b.onclick=()=>showIntro(S.lessons.find(l=>l.id===b.dataset.id)));
  app.querySelectorAll('.kcard[data-ser]').forEach(b=>b.onclick=()=>showIntro(chapterLesson(S.lessons.find(l=>l.id===b.dataset.ser),+b.dataset.ch)));
  app.querySelectorAll('.mbig').forEach(b=>b.onclick=()=>showBig(S.lessons.find(l=>l.id===b.dataset.big)));
  window.scrollTo(0,0);
}
