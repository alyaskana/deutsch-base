/* ---------- v114: «Род слова» и «Тренировать» (перенос Artikelregen, макет Г утверждён Алиной 2026-11-12) ----------
   Данные: ARD (deutsch-base build/artikel.json; свежая копия из базы lessons/_artikel): 43 правила целиком, слова игры, 693 подсказки.
   Экран «Род слова»: поиск с подсказками с первых букв, таблица окончаний (три рода, окончание + пример с картинкой),
   цельная карточка правила листом поверх таблицы (листается стрелками и свайпом внутри рода).
   Игра «Тренировать»: всё из Artikelregen (раунд 20 слов, 3 жизни, серия ×2/×3, ускорение, интервальное повторение, наборы, темы).
   Верный ответ идёт дальше сам, ошибка открывает панель с «Дальше». Прогресс: S.progress.art {w:{слово:{ok,bad,t,iv,d,lapse}},best,rounds}. */
const RG_G=['der','die','das'],RG_L={r:'der',e:'die',s:'das'},RG_ROUND=20,RG_LIVES=3,RG_DAY=864e5;
const RG_TOP={Gesundheit:'Здоровье',Alltag:'Будни',Essen:'Еда',Kleidung:'Одежда',Einkaufen:'Покупки',Unterwegs:'В пути',Arbeit:'Работа',Wohnen:'Дом',Freizeit:'Досуг',Familie:'Семья',Stadt:'Город',Texte:'Из текстов','Уроки':'С уроков'};
let RGD=null,rgFrom=null,rgCur=null,rgQT=0;
function rgData(){if(RGD&&RGD.src===ARD)return RGD;
  const W=ARD.W.map(([w,g,ru,t,lvl,hard])=>({w,g:RG_L[g]||g,ru,t:t==='Beruf'?'Alltag':t,lvl,hard:!!hard})),by={};W.forEach(x=>by[x.w.toLowerCase()]=x);
  const R=ARD.R.map((r,i)=>({...r,id:i,rx:r.re?new RegExp(r.re):null}));
  return RGD={src:ARD,W,by,R}}
function rgMine(r){const D=rgData();return r.rx?D.W.filter(x=>r.rx.test(x.w.toLowerCase())&&x.w.length>2):(r.list||[]).map(l=>D.by[l]).filter(Boolean)}
function rgExtra(r){const have=new Set(rgMine(r).map(x=>x.w.toLowerCase()));return (r.ex||[]).map(s=>{const[a,b]=s.split(':');const[g,...w]=a.split(' ');return{w:w.join(' '),g,ru:b||''}}).filter(x=>!have.has(x.w.toLowerCase()))}
/* доля рода для подписи над блоком: опубликованная цифра правила, иначе слово «исключения» */
function rgPct(r){if(!r.pct)return null;const p={der:0,die:0,das:0,...r.pct};const s=p.der+p.die+p.das;if(s<100){const rest=RG_G.filter(g=>g!==r.g&&r.sec[g]);rest.forEach(g=>{if(!r.pct[g])p[g]=(100-s)/(rest.length||1)})}return p}
function rgHint(w,g){const r=gRule(w,g);return r?r.t:''}
const rgA=g=>`<b class="rg-a rg-${g}">${g}</b>`;
const rgPaint=t=>esc(t).replace(/\b(der|die|das)\b/g,a=>rgA(a));
function rgEx(r){const x=r.ex1||{};let h=esc(x.w||'');const hl=x.hl||'';
  if(hl[0]==='^'){const k=hl.length-1;h=`<i>${esc(x.w.slice(0,k))}</i>${esc(x.w.slice(k))}`}
  else if(hl){const k=x.w.length-hl.length;h=`${esc(x.w.slice(0,k))}<i>${esc(x.w.slice(k))}</i>`}
  return {em:x.emoji||'',html:h,lab:x.label||'',hl,ru:x.ru||''}}
function rgRuleOf(x){const l=x.w.toLowerCase(),R=rgData().R;return R.find(r=>r.rx&&r.g===x.g&&!r.weak&&r.rx.test(l))||R.find(r=>r.list&&r.list.includes(l))||R.find(r=>r.rx&&!r.weak&&r.rx.test(l))||R.find(r=>r.rx&&r.rx.test(l))||null}

/* ---------- прогресс игры ---------- */
function rgP(){const p=S.progress;if(!p.art)p.art={w:{},best:0,rounds:0};if(!p.art.w)p.art.w={};return p.art}
function rgSrs(w){const P=rgP(),s=P.w[w];if(!s)return null;const now=Date.now();
  if(s.d==null){if(rgKnown(w)){s.iv=4;s.d=(s.t||now)+4*RG_DAY}else if(s.bad>s.ok){s.iv=0;s.d=s.t||now}else{s.iv=1;s.d=(s.t||now)+RG_DAY}}
  return s}
const rgKnown=w=>{const s=rgP().w[w];return !!s&&s.ok>=3&&s.ok>=s.bad*3};
const rgWeak=w=>{const s=rgP().w[w];return !!s&&s.bad>0&&!rgKnown(w)};
const rgDue=w=>{const s=rgSrs(w);return !!s&&s.d<=Date.now()};
/* правильно вовремя: интервал ×2.5 (быстро) или ×1.8; первый успех — 1 день; слишком рано — без изменений; ошибка — снова через 10 минут */
function rgSchedule(s,ok,fast){const now=Date.now(),prev=s.t||now,iv=s.iv||0,el=(now-prev)/RG_DAY;
  if(!ok){s.iv=0;s.d=now+10*60e3;s.lapse=(s.lapse||0)+1;return}
  if(iv>0&&s.d>now&&el<iv*.5)return;
  s.iv=iv<=0?1:Math.min(180,Math.round(Math.max(iv,el)*(fast?2.5:1.8)*10)/10);s.d=now+s.iv*RG_DAY}
function rgInDays(s){const n=Math.round((s.d-Date.now())/RG_DAY);return n<=0?'сегодня':n===1?'завтра':'через '+n+' '+plural(n,'день','дня','дней')}
/* слова из словаря: всё, что сохранила или отметила «Учить», если это существительное с артиклем.
   Слова из базы игры берут её род; новых в базе — добавляются в общий список под темой «Мои». */
let RGMY=null;const RG_MY=5;
function rgMy(){const L=savedList(),key=L.length+'|'+L.reduce((a,x)=>Math.max(a,x.t||0),0);
  if(RGMY&&RGMY.key===key&&RGMY.src===ARD)return RGMY;
  const D=rgData(),set=new Set(),add=[];
  L.forEach(x=>{const m=String(x.de||'').trim().match(/^(der|die|das)\s+([A-ZÄÖÜ][A-Za-zÄÖÜäöüß-]+)$/);if(!m)return;const l=m[2].toLowerCase();if(set.has(l))return;set.add(l);
    if(!D.by[l])add.push({w:m[2],g:m[1],ru:x.ru||'',t:'Мои',lvl:'',hard:false})});
  return RGMY={key,src:ARD,set,all:D.W.concat(add)}}
const rgIsMy=x=>rgMy().set.has(x.w.toLowerCase());
function rgPool(m){const W=rgMy().all,P=rgP();
  if(m==='my')return W.filter(rgIsMy);
  if(m.startsWith('rule:')){const r=rgData().R[+m.slice(5)];return r?rgMine(r).concat(rgExtra(r)):[]}
  if(m==='mix')return W;if(m==='a2')return W.filter(x=>x.lvl==='A2');if(m==='hard')return W.filter(x=>x.hard);
  if(m==='due')return W.filter(x=>rgDue(x.w));if(m==='weak')return W.filter(x=>rgWeak(x.w));if(m==='new')return W.filter(x=>!P.w[x.w]);
  return W.filter(x=>x.t===m)}
function rgPick(m){const P=rgP();let src=rgPool(m).slice(),out=[];
  /* умный раунд: до 5 слов из словаря — сначала те, что пора повторить, потом ошибки и новые; выученные не раньше срока */
  if(m==='mix'){const sc=x=>(rgDue(x.w)?3:0)+(rgWeak(x.w)?2:0)+(P.w[x.w]?0:1)-(rgKnown(x.w)&&!rgDue(x.w)?3:0)+Math.random();
    out=rgPool('my').map(x=>[sc(x),x]).filter(a=>a[0]>.5).sort((a,b)=>b[0]-a[0]).slice(0,RG_MY).map(a=>a[1]);
    const t0=new Set(out);src=src.filter(x=>!t0.has(x))}
  if(m==='mix'||m==='due'){const od=x=>{const s=rgSrs(x.w);return s.iv?(Date.now()-s.d)/(s.iv*RG_DAY):1e9};
    out=out.concat(src.filter(x=>rgDue(x.w)).sort((a,b)=>od(b)-od(a)).slice(0,RG_ROUND-out.length));
    if(m==='due')return shuffle(out);
    const t1=new Set(out),fresh=shuffle(src.filter(x=>!P.w[x.w]&&!t1.has(x))).slice(0,Math.max(0,Math.min(6,RG_ROUND-out.length)));
    out=out.concat(fresh);const taken=new Set(out);src=src.filter(x=>!taken.has(x)&&!rgDue(x.w));
    if(out.length>=RG_ROUND)return shuffle(out.slice(0,RG_ROUND))}
  const wt=x=>{const s=rgSrs(x.w);if(!s)return 3;return Math.max(.4,1+s.bad*2.5-s.ok*.6+(x.hard?1:0)+(rgDue(x.w)?3:0))};
  const target=Math.min(RG_ROUND,out.length+src.length);
  while(out.length<target){let r=Math.random()*src.reduce((a,x)=>a+wt(x),0),i=0;for(;i<src.length;i++){r-=wt(src[i]);if(r<=0)break}out.push(src.splice(Math.min(i,src.length-1),1)[0])}
  return m==='mix'?shuffle(out):out}

/* ---------- экран «Род слова» ---------- */
function rgTable(){let h='<div class="rg-tbl">';
  for(const g of RG_G){h+=`<div class="rg-col"><div class="rg-colh rg-bg-${g}">${g}</div>`;
    rgData().R.filter(r=>r.g===g).forEach(r=>{const x=rgEx(r);
      h+=`<button class="rg-xc" data-card="${r.id}" aria-label="${esc(r.end)}, например ${esc(g+' '+(r.ex1||{}).w)}"><b class="rg-xe">${x.hl?esc(r.end.split(' и ')[0]):esc(x.lab)}</b><span class="rg-xw rg-k-${g}"><span class="rg-xm" aria-hidden="true">${x.em}</span><span>${x.html}</span></span></button>`});
    h+='</div>'}
  return h+'</div>'}
function rgEntry(){const P=rgP(),dn=rgMy().all.filter(x=>rgDue(x.w)).length;
  return `<button class="rg-entry" data-rg="menu"><span class="rg-drops" aria-hidden="true"><i></i><i></i><i></i></span><span><b>Тренировать</b><small>${dn?dn+' '+plural(dn,'слово','слова','слов')+' пора повторить':'раунд '+RG_ROUND+' слов'}${P.best?' · рекорд '+P.best:''}</small></span><span class="rg-chev" aria-hidden="true">›</span></button>`}
function showRod(){sayStop();
  view='rod';lesson=null;stopTimers();dock('');document.body.classList.remove('sea');rgCur=null;
  const D=dictAll(),nart=a=>D.all.filter(e=>e.de.startsWith(a+' ')).length;
  app.innerHTML=`<div class="stop"><button class="x" id="rgup" aria-label="Назад">${BACK_SVG}</button><h1>Род слова</h1></div>
    <form class="msay rg-find" id="rgf" role="search"><input id="rgq" type="search" enterkeyhint="search" placeholder="Слово, например Zeitung" aria-label="Слово" autocomplete="off" autocapitalize="off" spellcheck="false"></form>
    <div id="rga"></div>${rgEntry()}${rgTable()}
    <div class="rg-all"><span class="label">Все слова по родам</span><div>${RG_G.map(a=>`<button class="rg-allb" data-v="art:${a}">${rgA(a)}<em>${nart(a)}</em>${CHEV}</button>`).join('')}</div></div>`;
  $('rgup').onclick=()=>{VV='home';showVocab()};
  app.querySelectorAll('.rg-allb').forEach(b=>b.onclick=()=>{VV=b.dataset.v;VF='new';VMORE=60;showVocab();window.scrollTo(0,0)});
  const q=$('rgq');q.oninput=()=>{clearTimeout(rgQT);rgQT=setTimeout(rgSearch,200)};$('rgf').onsubmit=e=>{e.preventDefault();clearTimeout(rgQT);rgSearch();q.blur()};
  window.scrollTo(0,0);
}
function rgLookup(q){const D=rgData(),l=q.toLowerCase().replace(/^(der|die|das)\s+/,'').trim();if(l.length<2)return null;
  for(let i=3;i<l.length-2;i++){const t=D.by[l.slice(i)];if(t)return {w:l[0].toUpperCase()+l.slice(1),g:t.g,h:`сложное слово: ${l.slice(0,i)} + ${t.g} ${t.w}. Род у последней части слова`,r:rgRuleOf(t)}}
  const R=D.R,r=R.find(r=>r.rx&&!r.weak&&r.rx.test(l))||R.find(r=>r.rx&&r.rx.test(l));const w=l[0].toUpperCase()+l.slice(1);
  if(r)return {w,g:r.g,h:`слова нет в базе. По окончанию ${r.end} скорее всего ${r.g}${r.pct&&r.pct[r.g]?` (≈ ${r.pct[r.g]}%)`:''}`,r};
  return {w,g:null,h:'слова нет в базе, и окончание ни на что не указывает',r:null}}
function rgSearch(){const box=$('rga'),inp=$('rgq');if(!box||!inp)return;const raw=inp.value.trim(),q=raw.toLowerCase().replace(/^(der|die|das)\s+/,'');
  if(q.length<2){box.innerHTML='';return}
  const D=rgData(),seen=new Set(D.W.map(x=>x.w.toLowerCase()));
  const extra=dictAll().all.map(e=>{const m=e.de.match(/^(der|die|das)\s+(\S+)$/);return m&&!seen.has(m[2].toLowerCase())?{w:m[2],g:m[1],ru:e.ru||''}:null}).filter(Boolean);
  const all=D.W.concat(extra),low=x=>x.w.toLowerCase();
  const pre=all.filter(x=>low(x).startsWith(q)),inn=all.filter(x=>!low(x).startsWith(q)&&(low(x).includes(q)||String(x.ru).toLowerCase().split(/[ ,;()]+/).some(t=>t.startsWith(q))));
  const L=pre.sort((a,b)=>a.w.length-b.w.length).concat(inn.sort((a,b)=>a.w.length-b.w.length)).slice(0,6);
  if(L.length){const rq=new RegExp('^('+q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+')','i');
    box.innerHTML=`<div class="rg-ans rg-sgs">`+L.map(x=>{const rr=rgRuleOf(x);return `<button class="rg-sg" ${rr?`data-card="${rr.id}"`:''} data-rgsay="${esc(x.g+' '+x.w)}"><span class="rg-w">${rgA(x.g)} ${esc(x.w).replace(rq,'<u>$1</u>')}</span><span class="rg-t">${esc(x.ru)}</span><span class="rg-h">${rgPaint(rgHint(x.w,x.g))}</span></button>`}).join('')+`</div>`;return}
  const a=rgLookup(raw);if(!a){box.innerHTML='';return}
  box.innerHTML=`<div class="rg-ans"><div class="rg-aw">${a.g?rgA(a.g)+' ':''}${esc(a.w)}</div><div class="rg-ah">${rgPaint(a.h)}</div>${a.r?`<button class="press light rg-ab" data-card="${a.r.id}">${esc((a.r.ex1||{}).emoji||'')} Правило ${esc(a.r.end)}</button>`:''}</div>`}

/* ---------- карточка правила листом ---------- */
function rgList(t){const gs=t.replace(/\.\s*$/,'').split(/\.\s+(?=[А-ЯЁA-ZÄÖÜ-])/).map(x=>{let lab='',body=x;const k=x.indexOf(':');if(k>0&&k<40&&!/\b(der|die|das)\b/.test(x.slice(0,k))){lab=x.slice(0,k);body=x.slice(k+1).trim()}
    const items=rgSplit(body).map(i=>i.replace(/^(и|плюс|но)\s+/i,''));const wordy=items.length>1||/^(\S+\s→\s)?(der|die|das)\s/.test(body);return {lab,items:wordy?items:null,text:body}});
  return '<ul class="rg-gul">'+gs.map(o=>`<li>${o.lab?`<b class="rg-gcat">${esc(o.lab)}:</b> `:''}${o.items?o.items.map(rgPaint).join(', '):rgPaint(o.text)}</li>`).join('')+'</ul>'}
function rgSplit(t){const out=[];let d=0,cur='';for(const c of t){if(c==='(')d++;if(c===')')d--;if(c===','&&d===0){out.push(cur);cur=''}else cur+=c}out.push(cur);return out.map(x=>x.trim()).filter(Boolean)}
function rgCard(r,anim){const g=r.g,x=rgEx(r),p=rgPct(r),m=rgMine(r).sort((a,b)=>(a.g!==g)-(b.g!==g)||a.w.localeCompare(b.w,'de')),ex=rgExtra(r);
  let h=`<div class="rg-card ${anim||''}"><div class="rg-dh"><span class="rg-mz rg-l-${g}" aria-hidden="true">${x.em}</span><span><span class="rg-e">${esc(r.end)}</span><span class="rg-m">${rgA(g)} <span class="rg-xsub rg-k-${g}">${x.html}</span>${x.ru?' · '+esc(x.ru):''}</span></span></div><p>${esc(r.lead)}</p>`;
  for(const y of [g,...RG_G.filter(z=>z!==g)]){if(!r.sec||!r.sec[y])continue;
    h+=`<div class="rg-sec"><div class="rg-gh"><span class="rg-tag rg-bg-${y}">${y}</span><span>${p?'≈ '+Math.round(p[y])+'%':y===g?'':'исключения'}</span></div>${rgList(r.sec[y])}</div>`}
  const all=m.slice(0,10).concat(ex.map(z=>({...z,ex:1})));
  if(all.length)h+=`<div class="rg-sec"><div class="rg-gh"><span class="label">Слова${m.length?' из игры · '+m.length:''}</span><span></span></div><div>`+all.map(z=>`<button class="rg-fw" data-hint="${esc(z.w)}|${z.g}"><span class="rg-w">${rgA(z.g)} ${esc(z.w)}${z.g!==g?'<span class="rg-x">исключение</span>':''}</span><span class="rg-t">${esc(z.ru)}</span></button>`).join('')+`</div>${m.length>10?`<div class="rg-more">ещё ${m.length-10}</div>`:''}</div>`;
  return h+'</div>'}
function rgPager(r){const rs=rgData().R.filter(x=>x.g===r.g),i=rs.indexOf(r);
  return `<div class="rg-pager"><button class="rg-rnd" data-step="-1" ${i?'':'disabled'} aria-label="Предыдущее правило">‹</button><span>${i+1} из ${rs.length} · ${r.g}</span><button class="rg-rnd" data-step="1" ${i<rs.length-1?'':'disabled'} aria-label="Следующее правило">›</button></div>`}
function rgStep(r,d){const rs=rgData().R.filter(x=>x.g===r.g);return rs[rs.indexOf(r)+d]||null}
function rgOpen(r,anim){if(!r)return;rgCur=r;rgClose(true);
  app.querySelectorAll('.rg-xc').forEach(c=>c.classList.toggle('on',+c.dataset.card===r.id));
  app.insertAdjacentHTML('beforeend',`<div class="rg-veil" data-close></div><div class="rg-sheet" role="dialog" aria-modal="true" aria-label="Правило ${esc(r.end)}"><div class="rg-grab"></div>${rgPager(r)}${rgCard(r,anim)}<div class="row2 rg-sbtn"><button class="press light" data-close>Закрыть</button><button class="press" data-rg="rule">Тренировать</button></div></div>`);
  const sh=app.querySelector('.rg-sheet');let x0=null;
  sh.addEventListener('touchstart',e=>{x0=e.touches[0].clientX},{passive:true});
  sh.addEventListener('touchend',e=>{if(x0==null)return;const dx=e.changedTouches[0].clientX-x0;x0=null;if(Math.abs(dx)>50){const n=rgStep(rgCur,dx<0?1:-1);if(n)rgOpen(n,dx<0?'sw':'swl')}});
  document.body.classList.add('rg-lock')}
function rgClose(keep){app.querySelector('.rg-veil')?.remove();app.querySelector('.rg-sheet')?.remove();if(!keep){app.querySelectorAll('.rg-xc.on').forEach(c=>c.classList.remove('on'));rgCur=null;document.body.classList.remove('rg-lock')}}
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&rgCur&&view==='rod')rgClose()});

/* ---------- меню игры ---------- */
function rgMenu(from){if(from)rgFrom=from;sayStop();view='game';stopTimers();rgClose();
  const W=rgMy().all,P=rgP(),my=rgPool('my'),myk=my.filter(x=>rgKnown(x.w)).length,seen=W.filter(x=>P.w[x.w]).length,k=W.filter(x=>rgKnown(x.w)).length,wk=W.filter(x=>rgWeak(x.w)).length,fresh=W.length-seen,dn=W.filter(x=>rgDue(x.w)).length;
  const nx=W.map(x=>P.w[x.w]&&rgSrs(x.w)).filter(s=>s&&s.d>Date.now()).sort((a,b)=>a.d-b.d)[0];
  const hero=(dn?`Сначала ${Math.min(dn,RG_ROUND)} из ${dn} ${plural(dn,'слова','слов','слов')}, которые пора повторить, потом новые.`:`Повторять пока нечего${nx?', следующие слова '+rgInDays(nx):''}. Раунд из новых слов и тех, что даются хуже.`)+(my.length?' Несколько слов в каждом раунде — твои из словаря.':'');
  const SETS=[['due','Пора повторить','↻','rg-l-good rg-k-good',dn?dn+' '+plural(dn,'слово ждёт','слова ждут','слов ждут')+' повторения':'на сегодня всё повторено'],
    ['my','Мои слова','★','rg-l-vio rg-k-vio',my.length?my.length+' '+plural(my.length,'слово','слова','слов')+' из словаря'+(myk?', выучено '+myk:''):'сохрани слова в словаре, и они появятся здесь'],
    ['weak','Мои ошибки','×','rg-l-die rg-k-die',wk?'повторить '+wk+' '+plural(wk,'слово','слова','слов'):'пока нет'],
    ['new','Новые слова','+','rg-l-der rg-k-der',fresh+' ещё не встречались'],
    ['hard','С занятий','!','rg-l-das rg-k-das',rgPool('hard').length+' слов, где ошибалась на занятиях'],
    ['a2','Слова A2','A2','rg-l-vio rg-k-vio',rgPool('a2').length+' слов уровня A2']];
  const ts={};W.forEach(x=>{(ts[x.t]=ts[x.t]||[]).push(x)});
  app.innerHTML=`<div class="stop"><button class="x" id="rgback" aria-label="Назад">${BACK_SVG}</button><h1>Тренировать</h1></div>
    <div class="rg-prog"><div class="rg-pm"><div><b>${k}</b> из ${W.length} выучено${wk?' · '+wk+' повторить':''}</div><span class="rg-bar"><i style="width:${k/W.length*100}%;background:var(--good)"></i><i style="width:${wk/W.length*100}%;background:var(--rg-die)"></i></span></div><div class="rg-rec"><b>${P.best||0}</b><span>рекорд</span></div></div>
    <div class="rg-hero"><b>Умный раунд</b><span>${esc(hero)}</span><button class="press" data-start="mix">Начать</button></div>
    <span class="label">Или набор</span><div class="rg-sets">${SETS.map(([m,t,ic,cl,sub])=>`<button class="rg-set" data-start="${m}" ${rgPool(m).length?'':'disabled'}><span class="rg-si ${cl}" aria-hidden="true">${ic}</span><span><b>${t}</b><small>${esc(sub)}</small></span><span class="rg-chev" aria-hidden="true">›</span></button>`).join('')}</div>
    <span class="label">Темы</span><div class="rg-tgrid">${Object.keys(RG_TOP).filter(t=>ts[t]).map(t=>{const L=ts[t],kn=L.filter(x=>rgKnown(x.w)).length;return `<button class="rg-tile" data-start="${esc(t)}"><b>${RG_TOP[t]}</b><small>${kn} из ${L.length}</small><span class="rg-bar"><i style="width:${Math.max(2,kn/L.length*100)}%;background:var(--good)"></i></span></button>`}).join('')}</div>`;
  $('rgback').onclick=rgBack;
  app.querySelectorAll('[data-start]').forEach(b=>b.onclick=()=>rgStart(b.dataset.start));
  window.scrollTo(0,0)}
/* для карточки слова в словаре: путаешь ли род в «Тренировать» */
function rgWordNote(e){try{const w=stripArt(String(e.own&&e.own.de||e.de||'')).trim();if(!/^[A-ZÄÖÜ]/.test(w))return '';const s=rgP().w[w];if(!s||!s.bad)return '';
  if(rgKnown(w))return `<p class="wnote">Род уже не путаешь: в «Тренировать» ${s.ok} ${plural(s.ok,'верный ответ','верных ответа','верных ответов')}.</p>`;
  return `<p class="wnote rg-wn">Путаешь род: ${s.bad} ${plural(s.bad,'ошибка','ошибки','ошибок')} в «Тренировать». Слово чаще попадается в раундах.</p>`}catch(_){return ''}}
function rgBack(){rgStop();if(rgFrom==='rod')return showRod();if(rgFrom&&rgFrom.startsWith('rule:')){showRod();rgOpen(rgData().R[+rgFrom.slice(5)]);return}showHome()}

/* ---------- раунд ---------- */
let RGS=null,RGRAF=0;
const rgMult=()=>RGS.combo>=10?3:RGS.combo>=5?2:1;
const RG_HEART=on=>`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-8-5.3-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.7-8 11-8 11z" fill="${on?'#E4474C':'#E6DFD3'}"/></svg>`;
function rgStop(){cancelAnimationFrame(RGRAF);if(RGS&&RGS.cur)RGS.cur.done=true;document.querySelector('.rg-play')?.remove();document.body.classList.remove('rg-lock')}
function rgStart(mode){rgStop();sayStop();aunlock();
  const list=rgPick(mode);if(!list.length)return toast('В этом наборе пока нет слов');
  const title=mode.startsWith('rule:')?'Правило '+rgData().R[+mode.slice(5)].end:RG_TOP[mode]||'';
  RGS={mode,list,i:0,score:0,combo:0,best:0,lives:RG_LIVES,miss:[],ok:0,title};
  const p=document.createElement('div');p.className='rg-play';p.setAttribute('role','dialog');p.setAttribute('aria-label','Тренировать артикли');
  p.innerHTML=`<div class="rg-hud"><button class="x" data-quit aria-label="Закончить">${ICON_X}</button><span class="rg-pb"><i></i></span><span class="rg-hearts" aria-label="Жизни"></span></div>
    <div class="rg-sline"><b aria-label="Очки">0</b><span></span></div><div class="rg-arena"><div class="rg-ground"></div></div>
    <div class="rg-keys">${RG_G.map(g=>`<button class="art ${g}" data-a="${g}">${g}</button>`).join('')}</div>`;
  document.body.appendChild(p);document.body.classList.add('rg-lock');
  p.querySelectorAll('[data-a]').forEach(b=>b.addEventListener('pointerdown',e=>{e.preventDefault();rgAnswer(b.dataset.a)}));
  p.querySelector('[data-quit]').onclick=()=>{if(!RGS)return;if(RGS.cur)RGS.cur.done=true;cancelAnimationFrame(RGRAF);if(!RGS.i){rgStop();rgMenu()}else rgFinish()};
  rgHud();rgNext()}
function rgHud(){const p=document.querySelector('.rg-play');if(!p||!RGS)return;
  p.querySelector('.rg-pb i').style.width=(RGS.i/RGS.list.length*100)+'%';
  p.querySelector('.rg-hearts').innerHTML=Array.from({length:RG_LIVES},(_,k)=>RG_HEART(k<RGS.lives)).join('');
  p.querySelector('.rg-sline b').textContent=RGS.score;
  p.querySelector('.rg-sline span').innerHTML=RGS.combo>=3?`<span class="streak">серия ${RGS.combo}${rgMult()>1?' · ×'+rgMult():''}</span>`:''}
function rgNext(){cancelAnimationFrame(RGRAF);const p=document.querySelector('.rg-play');if(!p)return;
  p.querySelector('.rg-fall')?.remove();p.querySelector('.rg-fb')?.remove();
  if(RGS.i>=RGS.list.length||RGS.lives<=0)return rgFinish();
  const x=RGS.list[RGS.i],d=document.createElement('div'),ar=p.querySelector('.rg-arena');d.className='rg-fall';
  d.innerHTML=`<span class="rg-fw2">${esc(x.w)}</span><span class="rg-fru">${esc(x.ru)}</span>`;ar.appendChild(d);
  const dur=Math.max(2600,7000-RGS.i*120-RGS.combo*90);RGS.cur={x,d,t0:performance.now(),dur,done:false};
  const step=now=>{const c=RGS&&RGS.cur;if(!c||c.done||c.d!==d)return;const k=(now-c.t0)/c.dur;d.style.transform=`translate(-50%,${k*(ar.clientHeight-110)}px)`;if(k>=1)return rgAnswer(null);RGRAF=requestAnimationFrame(step)};
  RGRAF=requestAnimationFrame(step)}
function rgAnswer(g){const c=RGS&&RGS.cur;if(!c||c.done)return;c.done=true;cancelAnimationFrame(RGRAF);
  const {x,d}=c,ok=g===x.g,P=rgP(),s=P.w[x.w]||(P.w[x.w]={ok:0,bad:0,iv:0,d:Date.now()}),k=(performance.now()-c.t0)/c.dur;
  rgSrs(x.w);rgSchedule(s,ok,k<.45);s.t=Date.now();
  d.classList.add('rg-'+x.g);d.querySelector('.rg-fw2').textContent=x.g+' '+x.w;say(x.g+' '+x.w);
  if(ok){s.ok++;RGS.ok++;RGS.combo++;RGS.best=Math.max(RGS.best,RGS.combo);RGS.score+=Math.round((10+(1-k)*10)*rgMult());
    d.querySelector('.rg-fw2').classList.add('pop');
    if(FX.on){fxbar(FXL[Math.min(RGS.combo-1,FXL.length-1)],0,{v:.42});fxbuzz(16)}
    if(RGS.combo>=5&&RGS.combo%5===0){const r=d.getBoundingClientRect();fxConfetti(r.left+r.width/2,r.top+20,40)}
    RGS.i++;rgHud();persist();setTimeout(()=>{if(RGS&&RGS.cur===c)rgNext()},650)}
  else{s.bad++;RGS.combo=0;RGS.lives--;RGS.miss.push({...x,said:g});RGS.i++;rgHud();persist();
    if(FX.on){fxknock(0);fxknock(.09,165);fxbuzz([28,70,28])}
    const r=gRule(x.w,x.g);
    document.querySelector('.rg-play').insertAdjacentHTML('beforeend',`<div class="rg-fb" role="alert"><h4>Правильный ответ: <span>${rgA(x.g)} ${esc(x.w)}</span></h4><div class="rg-said">${g?'Твой ответ: <s>'+g+'</s>':'Не успела ответить'}</div>${r?`<div class="rg-why"><small>Почему ${x.g} · ${esc(r.k.toLowerCase())}</small><div>${rgPaint(r.t)}</div></div>`:''}<button class="press" data-next>Дальше</button></div>`);
    const nb=document.querySelector('.rg-fb [data-next]');nb.onclick=()=>{if(RGS&&RGS.cur===c)rgNext()};nb.focus({preventScroll:true})}}
function rgFinish(){cancelAnimationFrame(RGRAF);const G=RGS;if(!G)return;const P=rgP();
  P.rounds=(P.rounds||0)+1;const rec=G.score>(P.best||0)&&G.score>0,old=P.best||0;P.best=Math.max(old,G.score);persist();
  rgStop();RGS=null;view='game';dock('');
  const sub=[`${G.ok} из ${G.i} верно`,`лучшая серия ${G.best}`];if(G.lives<=0)sub.push('жизни кончились');
  app.innerHTML=`<div class="stop"><button class="x" id="rgback" aria-label="Назад">${BACK_SVG}</button><h1>${G.title?esc(G.title):'Итог'}</h1></div>
    <div class="card done rg-res"><span class="label">Тренировать</span><div class="w1big">${G.score}</div><h2>${rec?'Новый рекорд':'Рекорд '+old}</h2><p class="mute">${sub.join(' · ')}</p>
    <div class="rg-t3s"><div class="rg-t3 rg-t-good"><small>верно</small><div>${G.ok}</div></div><div class="rg-t3 rg-t-die"><small>ошибки</small><div>${G.miss.length}</div></div><div class="rg-t3 rg-t-blue"><small>серия</small><div>${G.best}</div></div></div></div>
    ${G.miss.length?`<span class="label">Ошибки раунда · вернутся в следующей тренировке</span><div class="rg-wl">${G.miss.map(x=>`<button class="rg-wr" data-rgsay="${esc(x.g+' '+x.w)}"><span class="rg-w">${rgA(x.g)} ${esc(x.w)}</span><span class="rg-t">${esc(x.ru)}</span><span class="rg-hint">${rgPaint(rgHint(x.w,x.g))}</span></button>`).join('')}</div>`:`<div class="card empty"><p>Без ошибок в этом раунде.</p></div>`}`;
  $('rgback').onclick=rgBack;
  dock(`<div class="row2"><button class="press light" id="rgm">Меню</button><button class="press" id="rga2">Ещё раунд</button></div>`);
  $('rgm').onclick=()=>rgMenu();$('rga2').onclick=()=>rgStart(G.mode);
  if(rec&&FX.on&&!FXRM)setTimeout(()=>fxFirework(innerWidth/2,innerHeight*.3,'#FFB21E'),300);
  window.scrollTo(0,0)}

/* ---------- проводка ---------- */
document.addEventListener('click',e=>{const t=e.target.closest&&e.target.closest('[data-rod],[data-rg],a[href="#rg"],[data-card],[data-close],[data-step],[data-hint],[data-rgsay]');if(!t)return;
  if(t.dataset.rod!=null){e.preventDefault();showRod();return}
  if(t.getAttribute('href')==='#rg'){e.preventDefault();rgMenu('home');return}
  if(t.dataset.rg==='menu'){rgMenu(view==='rod'?'rod':'home');return}
  if(t.dataset.rg==='rule'){const r=rgCur;if(r){rgFrom='rule:'+r.id;rgStart('rule:'+r.id)}return}
  if(view!=='rod'&&view!=='game')return;
  if(t.dataset.card!=null&&view==='rod'){rgOpen(rgData().R[+t.dataset.card]);if(t.dataset.rgsay)say(t.dataset.rgsay);return}
  if(t.hasAttribute('data-close')){rgClose();return}
  if(t.dataset.step){const n=rgCur&&rgStep(rgCur,+t.dataset.step);if(n)rgOpen(n,+t.dataset.step>0?'sw':'swl');return}
  if(t.dataset.hint){const[w,g]=t.dataset.hint.split('|');say(g+' '+w);const n=t.querySelector('.rg-hint');if(n)return n.remove();const s=document.createElement('span');s.className='rg-hint';s.innerHTML=rgPaint(rgHint(w,g));t.appendChild(s);return}
  if(t.dataset.rgsay)say(t.dataset.rgsay)});
