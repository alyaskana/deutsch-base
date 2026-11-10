# ---------- 2d. «Слова»: поле «Как сказать» первым, слова на сегодня, der/die/das, «Мои слова», темы плитками ----------
def patch(s):
    def rep(a,b,n=1):
        assert s[0].count(a)==n,(s[0].count(a),a[:70]);s[0]=s[0].replace(a,b)
    s=[s]
    a=s[0].index("  const head=`<div class=\"card vhead\">");b=s[0].index("  let body='',list=[],train=[];",a)
    s[0]=s[0][:a]+"""  const head=`<div class="vhd"${VV==='home'||q?'':' hidden'}><h1 class="mh1">Слова</h1><form class="msay vsayf" id="vform"><input id="vq" type="text" enterkeyhint="send" placeholder="Слово, фраза или вопрос" aria-label="Слово, фраза или вопрос" value="${esc(VQ)}" autocomplete="off" autocapitalize="off" spellcheck="false"><button type="submit" aria-label="Спросить">${ICON_SEND}</button></form></div>`;
"""+s[0][b:]
    rep("if(!['home','mine','learn','asked'].includes(VV)&&!topic)VV='home';","const ART=/^art:(der|die|das)$/.test(VV)?VV.slice(4):'';if(!['home','mine','learn','asked'].includes(VV)&&!topic&&!ART)VV='home';")
    rep("body=(list.length?listHTML(list,''):'')+`<div id=\"vsay\"></div>`;","body=(list.length?listHTML(list,''):'')+`<button class=\"sbtn vask\" id=\"vask\">Спросить: ${esc(q)}</button>`;")
    a=s[0].index("    const ls=topicStats(D.learn),due=vocabDue().length;");b=s[0].index("  }else if(VV==='asked'){",a)
    s[0]=s[0][:a]+r"""    const due=vocabDue().length,pw=planWords(),wd=wordsDoneToday(),nart=a=>D.all.filter(e=>e.de.startsWith(a+' ')).length;
    const TS=T.map(t=>({t,L:D.all.filter(e=>e.t.includes(t.k))})).filter(x=>x.L.length).sort((x,y)=>y.L.length-x.L.length);
    const tile=(t,L,i)=>{const A=TOPIC_ART[t.n]||TOPIC_ART['Разное'],K=topicStats(L).k;
      return i?`<button class="vtop" data-v="${t.k}" style="--c:${A[0]}"><b>${esc(t.n)}</b><em>${K}<small>/${L.length}</small></em><svg viewBox="${A[1]}" aria-hidden="true">${A[2]}</svg><span class="tbar"><i class="k" style="width:${L.length?K/L.length*100:0}%"></i></span></button>`
        :`<button class="vtop wide" data-v="${t.k}"><b>${esc(t.n)}</b><em>${K}<small> из ${L.length}</small></em><svg viewBox="${A[1]}" aria-hidden="true">${A[2]}</svg><span class="tbar"><i class="k" style="width:${L.length?K/L.length*100:0}%"></i></span></button>`};
    body=`${pw.length||wd?`<button class="vday${wd?' ok':''}" id="vtoday"><i class="circ"></i><span class="t"><b>${wd?'✓':pw.length}</b><span>${wd?'слова на сегодня сделаны':plural(pw.length,'слово','слова','слов')+' на сегодня'}</span></span><svg class="cards" viewBox="0 0 120 96" aria-hidden="true"><rect x="34" y="14" width="56" height="72" rx="12" fill="#F0AA3C" transform="rotate(16 62 50)"/><rect x="30" y="12" width="56" height="72" rx="12" fill="#E4474C" transform="rotate(2 58 48)"/><rect x="24" y="10" width="56" height="72" rx="12" fill="#fff" transform="rotate(-12 52 46)"/><g transform="rotate(-12 52 46)" stroke="#4DB6F2" stroke-width="5" stroke-linecap="round"><path d="M36 30h22"/><path d="M36 44h32" opacity=".5"/><path d="M36 56h18" opacity=".5"/></g></svg>${wd?'':`<i class="pl">${ICON_PLAY_S}</i>`}</button>`:''}
     <div class="varts">${['der','die','das'].map(a=>`<button class="vart ${a}" data-v="art:${a}"><b>${a}</b><span>${nart(a)}</span></button>`).join('')}</div>
     <div class="vlns"><button class="vln" data-v="mine"><b>Мои слова</b><em>${D.mine.length}</em>${CHEV}</button>${D.learn.length?`<button class="vln" data-v="learn"><b>Учу</b><em>${D.learn.length}</em>${CHEV}</button>`:''}</div>
     <h3 class="msec">Темы</h3>
     <div class="vtopics">${TS.map(({t,L},i)=>tile(t,L,i)).join('')}</div>`;
"""+s[0][b:]
    rep("  }else if(VV==='mine'||VV==='learn'){","""  }else if(ART){
    const L=D.all.filter(e=>e.de.startsWith(ART+' ')).sort((a,b)=>a.kd.localeCompare(b.kd,'de')),st=topicStats(L);list=L;
    body=`<div class="stop"><button class="x" id="vup" aria-label="Назад">${BACK_SVG}</button><h1>${ART}</h1><em class="scnt">${st.n}</em></div>${listHTML(list,'Пока ни одного слова.')}`;
    train=learnTrainSet(L.filter(e=>wState(e)==='learn'));
  }else if(VV==='mine'||VV==='learn'){""")
    a=s[0].index("    body=`<div class=\"card dhead\" style=\"--c:#7444E6\"><button class=\"back\" id=\"vup\">");b=s[0].index("\n",a)
    s[0]=s[0][:a]+r"""    const d0=new Date();d0.setHours(0,0,0,0);const T0=d0.getTime(),grp=t=>t>=T0?'Сегодня':t>=T0-DAY?'Вчера':t>=T0-7*DAY?'На этой неделе':'Раньше',G=[];
    askHist().slice().sort((x,y)=>(y.t||0)-(x.t||0)).forEach(h=>{const g=grp(h.t||0);if(!G.length||G[G.length-1].g!==g)G.push({g,a:[]});G[G.length-1].a.push(h)});
    body=`<div class="stop"><button class="x" id="vup" aria-label="Назад">${BACK_SVG}</button><h1>Я спрашивала</h1></div>
      ${G.length?G.map(x=>`<h3 class="msec s">${x.g}</h3><div class="ahl">${x.a.map(h=>`<button data-q="${esc(h.q)}"><span>${esc(h.q)}${h.n>1?`<i>×${h.n}</i>`:''}</span><b>${esc(h.de)}</b></button>`).join('')}</div>`).join(''):`<div class="card empty">${mascot('cloud','#5D7F95','wow',true)}<p>Здесь появится всё, что ты спросишь в «Как сказать».</p></div>`}`;"""+s[0][b:]
    rep("  if($('vup'))$('vup').onclick=()=>{VV='home';showVocab()};","  if($('vup'))$('vup').onclick=()=>{if(VV==='asked'&&ASKBACK){ASKBACK=false;VV='home';return showSay(true)}VV='home';showVocab()};app.querySelectorAll('.ahl button').forEach(b=>b.onclick=()=>sayRun(b.dataset.q));")
    rep("  if(q.length>=2)drawVSay(q,!list.length);\n","")
    rep("  $('back').onclick=()=>{if(VV!=='home'&&!q){VV='home';showVocab()}else showHome()};","  $('back').hidden=(VV==='home'&&!q)||!!$('vup');$('back').onclick=()=>{if(q){VQ='';showVocab()}else{VV='home';showVocab()}};")
    rep("const BACK_SVG=","const ICON_PLAY_S='<svg viewBox=\"0 0 24 24\" fill=\"currentColor\" aria-hidden=\"true\"><path d=\"M8 5.5v13a1 1 0 0 0 1.5.86l11-6.5a1 1 0 0 0 0-1.72l-11-6.5A1 1 0 0 0 8 5.5z\"/></svg>',CHEV='<svg class=\"chev\" viewBox=\"0 0 20 20\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.6\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M8 4l6 6-6 6\"/></svg>';\nconst BACK_SVG=")
    rep("vq.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();const q=vq.value.trim();if(q.length>=2&&q!==VQ.trim()){clearTimeout(VQT);VQ=vq.value;showVocab('q')}if(q.length>=2)drawVSay(q,!app.querySelector('.wlist'),true);vq.blur()}};",
        "const ask=()=>{const q=vq.value.trim();if(q.length<2)return;clearTimeout(VQT);VQ='';sayRun(q)};$('vform').onsubmit=e=>{e.preventDefault();ask()};if($('vask'))$('vask').onclick=ask;if($('vtoday'))$('vtoday').onclick=()=>{const w=planWords();if(w.length)startReview(w,{title:'Слова дня',back:showVocab})};")
    rep("const backHTML=`${BACK_SVG}${VV==='home'||q?'Уроки':'Словарик'}`;","const backHTML=`${BACK_SVG}Слова`;")
    # мои слова и «учу»: шапка, плитка повтора, список
    a=s[0].index("    list=VV==='mine'?D.mine:D.learn;");b=s[0].index("  }else{\n    const L=D.all.filter(e=>e.t.includes(topic.k))",a)
    s[0]=s[0][:a]+r"""    list=VV==='mine'?D.mine:D.learn;
    train=VV==='learn'?learnTrainSet(D.learn):vocabTrainSet().filter(c=>D.mine.some(e=>'v|'+e.own.id===c.id));
    body=`<div class="stop"><button class="x" id="vup" aria-label="Назад">${BACK_SVG}</button><h1>${VV==='mine'?'Мои слова':'Учу'}</h1><em class="scnt">${list.length}</em></div>
      ${train.length?`<button class="vday yl" id="vtrain"><i class="circ"></i><span class="t"><b>${train.length}</b><span>${VV==='mine'?plural(train.length,'ждёт','ждут','ждут')+' повтора':plural(train.length,'слово','слова','слов')+' потренировать'}</span></span><i class="pl">${ICON_PLAY_S}</i></button>`:''}
      ${list.length?`<h3 class="msec s">${VV==='mine'?'Недавние':'Слова'}</h3>`:''}
      ${listHTML(list,VV==='mine'?'Здесь будут твои слова: сохранённые из заданий, добавленные вручную и найденные через «Как сказать».':'Открой тему, разбери слова и отметь «Учить». Слова с ошибками попадут сюда сами.')}
      ${VV==='mine'?`<details class="vaddd card"><summary>+ Добавить своё слово или фразу</summary><form class="vadd" id="vadd"><input class="field" id="vde" placeholder="По-немецки, с артиклем: die Bucht" autocomplete="off" autocapitalize="off" spellcheck="false"><input class="field" id="vru" placeholder="Перевод, коротко" autocomplete="off"><input class="field" id="vnt" placeholder="Подсказка (необязательно)" autocomplete="off"><button class="press" type="submit">Добавить</button></form></details>`:''}`;
"""+s[0][b:]
    # тема: шапка, плитка новых слов, «Учу сейчас» и «Уже знаю», все слова по кнопке
    a=s[0].index("    if(!['new','learn','known','all'].includes(VF))VF='new';");b=s[0].index("    train=learnTrainSet(L.filter(e=>wState(e)==='learn'));",a)
    s[0]=s[0][:a]+r"""    const fresh=L.filter(e=>wState(e)==='new'),lrn=L.filter(e=>wState(e)==='learn'),kn=L.filter(e=>wState(e)==='known');
    list=VF==='all'?L:lrn.concat(kn);
    const sect=(h,arr,off)=>{const sh=arr.filter((e,k)=>off+k<VMORE);return sh.length?`<h3 class="msec s">${h}</h3><div class="wlist">${sh.map((e,k)=>wRow(e,off+k)).join('')}</div>`:''};
    body=`<div class="stop"><button class="x" id="vup" aria-label="Назад">${BACK_SVG}</button><h1>${esc(topic.n)}</h1><em class="scnt">${s.n}</em></div>
      ${fresh.length?`<button class="vday mint" id="vswipe"><i class="circ"></i><span class="t"><b>${Math.min(fresh.length,20)}</b><span>${plural(Math.min(fresh.length,20),'новое слово','новых слова','новых слов')}</span></span><i class="pl">${ICON_PLAY_S}</i></button>`:''}
      ${VF==='all'?listHTML(L,'Пока ни одного слова.'):`${sect('Учу сейчас',lrn,0)}${sect('Уже знаю',kn,lrn.length)}${list.length>VMORE?`<button class="press ghost" id="vmore">Показать ещё · ${list.length-VMORE}</button>`:''}<button class="sbtn vask" id="vall">Все слова темы · ${s.n}</button>`}`;
"""+s[0][b:]
    rep("    train=learnTrainSet(L.filter(e=>wState(e)==='learn'));\n    VSW={list:fresh,topic};","    VSW={list:fresh,topic};")
    a=s[0].index("  if(train.length)dockBtn(`Тренировать · ${train.length}`");b=s[0].index("\n",a)
    s[0]=s[0][:a]+"  dock('');if($('vtrain'))$('vtrain').onclick=()=>startReview(train,{title:VV==='mine'?'Мои слова':'Учу',back:showVocab});if($('vall'))$('vall').onclick=()=>{VF='all';VMORE=60;showVocab(true)};"+s[0][b:]
    s[0]=s[0].replace("function showVocab(keep){",open(__file__.replace('vocab.py','topicart.js')).read()+"function showVocab(keep){",1)
    return s[0]
