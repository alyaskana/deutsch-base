/* ---------- v79: «Как сказать» разговором: её сообщение, ответ карточкой от маскота, поле внизу ---------- */
let ASKBACK=false,SAYLOG=[],SAYBACK=()=>showHome();
const ICON_CLOCK='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>';
/* одно поле: тьютор сам различает «как сказать слово или фразу» и вопрос о языке */
async function askAny(q){
  const a=await S.sample.json(`Русскоязычная ученица немецкого (уровень A2) написала тьютору: """${q}"""
Сначала реши, что это.
ВАРИАНТ 1. Слово или фраза, которую она хочет сказать по-немецки, либо немецкое слово или фраза, которую надо понять или поправить. Тогда дай самый обычный способ сказать это по-немецки, простыми словами её уровня. Одно слово или короткое выражение давай без лишних слов вокруг: существительное с определённым артиклем в именительном падеже (например, die Schildkröte), глагол в инфинитиве, прилагательное в базовой форме. Фразу или предложение переведи целиком. Если она написала по-немецки, дай правильное написание.
Ответ: {"kind":"word","de":"по-немецки","ru":"коротко по-русски, что значит de","ex":"для слова: один короткий простой пример по-немецки — перевод примера; для фразы пустая строка"}
ВАРИАНТ 2. Вопрос о языке: в чём разница между словами, когда что говорить, как работает правило. Тогда объясни коротко и просто, по-русски, без терминов, которые она может не знать.
Ответ: {"kind":"q","lead":"суть одним коротким предложением","items":[{"de":"слово или форма, о которой речь","ru":"два-три слова по-русски","note":"одно-два простых предложения: когда это говорят","ex":[["короткий пример по-немецки, ключевое слово выдели **так**","перевод"],["второй пример","перевод"]]}],"check":"одна короткая подсказка, как выбрать правильно","tasks":[{"s":"простое предложение по-немецки с одним пропуском ___","ru":"перевод предложения","o":["вариант","вариант"],"a":"верный вариант, в точности как в o","n":"почему так, одно предложение по-русски"}]}
Для сравнения двух слов дай два items, для одного правила один или два. tasks ровно пять, уровень A2, варианты берутся из разбираемых слов или форм.
Ответь только JSON, без пояснений.`,{modelTier:'quick'});
  if(a&&a.kind==='q'&&Array.isArray(a.items)&&a.items.length){
    const str=x=>String(x||'').trim();
    return {kind:'q',lead:str(a.lead),check:str(a.check),
      items:a.items.slice(0,3).map(x=>({de:str(x.de),ru:str(x.ru),note:str(x.note),ex:(Array.isArray(x.ex)?x.ex:[]).slice(0,2).map(e=>[str(e&&e[0]),str(e&&e[1])]).filter(e=>e[0])})).filter(x=>x.de),
      tasks:(Array.isArray(a.tasks)?a.tasks:[]).map(t=>({s:str(t.s),ru:str(t.ru),o:(Array.isArray(t.o)?t.o:[]).map(str).filter(Boolean),a:str(t.a),n:str(t.n)})).filter(t=>t.s.includes('___')&&t.o.length>1&&t.o.includes(t.a)).slice(0,5)};
  }
  return {kind:'word',de:String(a.de||'').trim(),ru:String(a.ru||'').trim(),ex:String(a.ex||'').trim()};
}
function sayLocal(q){const D=dictAll(),r=dictSearch(D.all.concat(D.mine.filter(e=>e.i<0)),q)[0];return r?{kind:'word',de:r.de,ru:r.ru,ex:r.ex||''}:null}
function sayRun(q){
  q=String(q||'').trim();if(q.length<2)return;
  const it={q,st:'busy',a:null,err:''};SAYLOG.push(it);if(SAYLOG.length>12)SAYLOG.shift();
  const done=()=>{if(view==='say')showSay(true)};
  const old=askFind(q);
  if(old&&old.de){it.a={kind:'word',de:old.de,ru:old.ru,ex:old.ex};it.h=askRec(q,it.a);it.st='ok';return showSay(true)}
  showSay(true);
  const local=()=>{const a=sayLocal(q);if(a){it.a=a;it.st='ok';return true}return false};
  if(!S.sample){if(!local()){it.st='err';it.err='Этого слова нет в словаре. Вопросы и новые слова работают, когда страница открыта в Claude.'}return done()}
  askAny(q).then(a=>{if(a.kind==='word'&&!a.de)throw new Error('empty');it.a=a;it.st='ok';if(a.kind==='word')it.h=askRec(q,a)})
    .catch(e=>{if(!local()){it.st='err';it.err=e&&e.code==='not_granted'?'Нужно разрешить странице обращаться к Claude.':'Не получилось, попробуй ещё раз.'}}).then(done);
}
function sayMd(t){return esc(t).replace(/\*\*(.+?)\*\*/g,'<b>$1</b>')}
function sayEx(de,ru){return de?`<div class="sexc"><div>${sayMd(de)}</div>${ru?`<span>${esc(ru)}</span>`:''}</div>`:''}
function sayItem(it,i){
  const a=it.a;let body='';
  if(it.st==='busy')body='<p class="think">Думаю</p>';
  else if(it.st==='err')body=`<p>${esc(it.err)}</p><button class="sbtn" data-retry="${i}">Ещё раз</button>`;
  else if(a.kind==='word'){const [exDe,exRu]=String(a.ex||'').split(/\s+—\s+/),isRu=/[а-яё]/i.test(it.q);
    body=`<div class="sblk c0"><div class="sbh"><span><b>${artHTML(a.de)}</b>${!isRu&&a.ru?`<em>${esc(a.ru)}</em>`:''}</span><button class="sspk" data-say="${esc(a.de)}" aria-label="Послушать: ${esc(a.de)}">${ICON_SPK}</button></div>${sayEx(exDe,exRu)}</div>
      ${it.h&&it.h.n>1?`<p class="srep2">Спрашивала уже ${it.h.n} ${plural(it.h.n,'раз','раза','раз')}</p>`:''}<div class="sact2" data-i="${i}"></div>`}
  else body=`${a.lead?`<p class="slead">${esc(a.lead)}</p>`:''}${a.items.map((x,k)=>`<div class="sblk c${k%2}"><div class="sbh"><span><b>${artHTML(x.de)}</b>${x.ru?`<em>${esc(x.ru)}</em>`:''}</span><button class="sspk" data-say="${esc(x.de)}" aria-label="Послушать: ${esc(x.de)}">${ICON_SPK}</button></div>${x.note?`<p>${esc(x.note)}</p>`:''}${x.ex.map(e=>sayEx(e[0],e[1])).join('')}</div>`).join('')}
      ${a.check?`<p class="scheck">${esc(a.check)}</p>`:''}${a.tasks.length>=3?`<button class="sbtn" data-prac="${i}">Потренировать</button>`:''}`;
  return `<div class="sq"><span>${esc(it.q)}</span></div><div class="sans"><span class="sava">${mascot('flower','violet','happy')}</span>${body}</div>`;
}
function showSay(stay){
  if(view==='vocab'&&VV!=='asked')SAYBACK=()=>{VV='home';VQ='';showVocab()};else if(view==='home')SAYBACK=()=>showHome();
  view='say';lesson=null;stopTimers();clearInterval(clockTimer);document.body.classList.remove('sea');
  const recent=askHist().slice(0,4);
  app.innerHTML=`<div class="stop"><button class="x" id="sback" aria-label="Назад">${BACK_SVG}</button><h1>Как сказать</h1><button class="x" id="shist" aria-label="Что я спрашивала">${ICON_CLOCK}</button></div>
    <div class="slog">${SAYLOG.length?SAYLOG.map(sayItem).join(''):`<div class="sans first"><span class="sava">${mascot('flower','violet','happy')}</span><p class="slead">Напиши слово, фразу или вопрос про немецкий. Отвечу здесь.</p>${recent.length?`<div class="srecent">${recent.map(h=>`<button data-q="${esc(h.q)}">${esc(h.q)}</button>`).join('')}</div>`:''}</div>`}</div>
    <div style="height:96px" aria-hidden="true"></div>`;
  dock(`<form class="msay" id="sform"><input id="sq" type="text" enterkeyhint="send" placeholder="Слово, фраза или вопрос" aria-label="Слово, фраза или вопрос" autocomplete="off" autocapitalize="off" spellcheck="false"><button type="submit" aria-label="Спросить">${ICON_SEND}</button></form>`);
  $('sback').onclick=()=>SAYBACK();
  $('shist').onclick=()=>{VV='asked';VQ='';ASKBACK=true;showVocab();window.scrollTo(0,0)};
  $('sform').onsubmit=e=>{e.preventDefault();const q=$('sq').value;$('sq').value='';sayRun(q)};
  app.querySelectorAll('.srecent button').forEach(b=>b.onclick=()=>sayRun(b.dataset.q));
  app.querySelectorAll('.sspk').forEach(b=>b.onclick=()=>say(b.dataset.say));
  app.querySelectorAll('[data-retry]').forEach(b=>b.onclick=()=>{const it=SAYLOG[+b.dataset.retry];SAYLOG.splice(+b.dataset.retry,1);sayRun(it.q)});
  app.querySelectorAll('[data-prac]').forEach(b=>b.onclick=()=>sayPractice(SAYLOG[+b.dataset.prac]));
  app.querySelectorAll('.sact2').forEach(o=>{const it=SAYLOG[+o.dataset.i],a=it.a,e=sayEntry(a.de);
    if(e){const b=document.createElement('button');b.type='button';b.className='sbtn';b.textContent=e.own?'Уже в твоём словарике · открыть':'Есть в словаре · открыть карточку';b.onclick=()=>showWord(e,()=>showSay(true));o.appendChild(b)}
    else{const b=saveBtn(a.de,/[а-яё]/i.test(it.q)?it.q:a.ru,'+ в словарик',a.ex,'Как сказать');b.className='sbtn';o.appendChild(b)}});
  if(stay)window.scrollTo(0,document.documentElement.scrollHeight);else window.scrollTo(0,0);
}
/* пять заданий по объяснению: обычный проигрыватель урока, прогресс уроков не трогает */
function sayPractice(it){
  if(!it||!it.a||!it.a.tasks)return;
  lesson={id:'drill',title:'Потренировать',sys:true,back:()=>showSay(true),stages:[{type:'choice',title:it.a.items.map(x=>x.de).join(' или '),shape:'flower',color:'violet',items:it.a.tasks.map(t=>({s:t.s,ru:t.ru,o:t.o.slice(),a:t.a,n:t.n}))}]};
  STAGES=lesson.stages;buildGloss(null);document.body.classList.remove('sea');startRun(null);
}
