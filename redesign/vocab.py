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
    body=`${pw.length||wd?`<button class="vtoday${wd?' ok':''}" id="vtoday"><b>${wd?'✓':pw.length}</b><span>${wd?'слова на сегодня сделаны':plural(pw.length,'слово','слова','слов')+' на сегодня'}</span>${wd?'':`<i>${ICON_PLAY_S}</i>`}</button>`:''}
     <div class="varts">${['der','die','das'].map(a=>`<button class="vart ${a}" data-v="art:${a}"><b>${a}</b><span>${nart(a)}</span></button>`).join('')}</div>
     <div class="vlns"><button class="vln" data-v="mine"><b>Мои слова</b><em>${D.mine.length}</em>${CHEV}</button><button class="vln" data-v="learn"><b>Учу</b><em>${D.learn.length}</em>${due?`<small>${due} пора повторить</small>`:''}${CHEV}</button></div>
     <h3 class="msec">Темы</h3>
     <div class="vtopics">${TS.map(({t,L},i)=>{const st=topicStats(L);return `<button class="vtop${i?'':' wide'}" data-v="${t.k}" style="--c:${mixHex(t.c,'#ffffff',.78)}"><b>${esc(t.n)}</b><em>${st.n}</em><span class="vm">${mascot(t.sh,t.c,'happy')}</span>${st.k||st.l?statBar(st):''}</button>`}).join('')}</div>`;
"""+s[0][b:]
    rep("  }else if(VV==='mine'||VV==='learn'){","""  }else if(ART){
    const L=D.all.filter(e=>e.de.startsWith(ART+' ')).sort((a,b)=>a.kd.localeCompare(b.kd,'de')),st=topicStats(L);list=L;
    body=`<div class="card dhead ink" style="--c:${({der:'#DDEFFB',die:'#FFC9DF',das:'#FFE9B0'})[ART]}"><button class="back" id="vup">${BACK_SVG}Слова</button><h2>${ART}</h2><p>${st.n} ${plural(st.n,'слово','слова','слов')} · знаю ${st.k} · учу ${st.l}</p></div>${listHTML(list,'Пока ни одного слова.')}`;
    train=learnTrainSet(L.filter(e=>wState(e)==='learn'));
  }else if(VV==='mine'||VV==='learn'){""")
    rep("${BACK_SVG}Темы</button><h2>Спрашивала</h2>","${BACK_SVG}Слова</button><h2>Я спрашивала</h2>")
    rep("  if(q.length>=2)drawVSay(q,!list.length);\n","")
    rep("  $('back').onclick=()=>{if(VV!=='home'&&!q){VV='home';showVocab()}else showHome()};","  $('back').hidden=(VV==='home'&&!q)||!!$('vup');$('back').onclick=()=>{if(q){VQ='';showVocab()}else{VV='home';showVocab()}};")
    rep("const BACK_SVG=","const ICON_PLAY_S='<svg viewBox=\"0 0 24 24\" fill=\"currentColor\" aria-hidden=\"true\"><path d=\"M8 5.5v13a1 1 0 0 0 1.5.86l11-6.5a1 1 0 0 0 0-1.72l-11-6.5A1 1 0 0 0 8 5.5z\"/></svg>',CHEV='<svg class=\"chev\" viewBox=\"0 0 20 20\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.6\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M8 4l6 6-6 6\"/></svg>';\nconst BACK_SVG=")
    rep("vq.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();const q=vq.value.trim();if(q.length>=2&&q!==VQ.trim()){clearTimeout(VQT);VQ=vq.value;showVocab('q')}if(q.length>=2)drawVSay(q,!app.querySelector('.wlist'),true);vq.blur()}};",
        "const ask=()=>{const q=vq.value.trim();if(q.length<2)return;clearTimeout(VQT);VQ='';sayRun(q)};$('vform').onsubmit=e=>{e.preventDefault();ask()};if($('vask'))$('vask').onclick=ask;if($('vtoday'))$('vtoday').onclick=()=>{const w=planWords();if(w.length)startReview(w,{title:'Слова дня',back:showVocab})};")
    rep("const backHTML=`${BACK_SVG}${VV==='home'||q?'Уроки':'Словарик'}`;","const backHTML=`${BACK_SVG}Слова`;")
    rep("""<div class="card dhead" style="--c:${VV==='mine'?'#5D7F95':'#7444E6'}">""","""<div class="card dhead ink" style="--c:${VV==='mine'?'#DDEFFB':'#E6DDFB'}">""")
    assert s[0].count("${BACK_SVG}Темы</button>")==2;s[0]=s[0].replace("${BACK_SVG}Темы</button>","${BACK_SVG}Слова</button>")
    return s[0]
