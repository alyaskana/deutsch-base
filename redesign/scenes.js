/* v88: чтение «По сценам»: абзац = сцена, реплики героев пузырями, открываются по одной */
const RAV={Mia:'<rect width="48" height="48" fill="#DDEFFB"/><path d="M10.5 23c0-9.5 6-15 13.5-15s13.5 5.5 13.5 15v14h-27z" fill="#7A3E22"/><path d="M7 50c0-10 7.5-15 17-15s17 5 17 15z" fill="#5B86F0"/><rect x="20.5" y="28" width="7" height="9.5" rx="3.5" fill="#F6CDAE"/><ellipse cx="24" cy="22.5" rx="9" ry="10" fill="#F6CDAE"/><path d="M14.5 21.5c.5-7.5 5-10.5 10-10.5 5.5 0 9 3.5 9 10.5-4.5-.5-8-2.5-10-6-1.5 3.5-4.5 5.5-9 6z" fill="#7A3E22"/><circle cx="20.5" cy="23" r="1.15" fill="#2B2440"/><circle cx="27.5" cy="23" r="1.15" fill="#2B2440"/><path d="M21.3 27q2.7 2 5.4 0" stroke="#2B2440" stroke-width="1.3" fill="none" stroke-linecap="round"/>',Tom:'<rect width="48" height="48" fill="#FFE0D2"/><path d="M7 50c0-10 7.5-15 17-15s17 5 17 15z" fill="#FF6B4A"/><rect x="20.5" y="28" width="7" height="9.5" rx="3.5" fill="#EDBE9A"/><ellipse cx="24" cy="22.5" rx="9" ry="10" fill="#EDBE9A"/><path d="M14.3 21c-.8-8 4-12 9.7-12s10.5 4 9.7 12c-1.5-3.5-4.5-5.3-9.7-5.3s-8.2 1.8-9.7 5.3z" fill="#2B2440"/><circle cx="20.5" cy="23" r="1.15" fill="#2B2440"/><circle cx="27.5" cy="23" r="1.15" fill="#2B2440"/><path d="M21.3 27q2.7 2 5.4 0" stroke="#2B2440" stroke-width="1.3" fill="none" stroke-linecap="round"/>'};
function rAva(w){return `<span class="rav">${RAV[w]?`<svg viewBox="0 0 48 48" aria-hidden="true">${RAV[w]}</svg>`:`<i>${esc(w[0]||'')}</i>`}<small>${esc(w)}</small></span>`}
function runScenes(st){
  const T=st.text,N=T.paragraphs.length,L=T.lines;let p=0,r=1;
  const gl=k=>{const m={},re=/\{\{([^|}]+)\|([^}]+)\}\}/g;let x;while((x=re.exec(T.paragraphs[k]||'')))x[1].toLowerCase().split(/\s+/).forEach(w=>{if(!m[w])m[w]=x[2]});return m};
  const tok=(t,G)=>t.split(WORD).map((w,i)=>i%2?(G[w.toLowerCase()]?`<span class="tk gl" data-w="${esc(w)}" data-g="${esc(G[w.toLowerCase()])}">${esc(w)}</span>`:`<span class="tk" data-w="${esc(w)}">${esc(w)}</span>`):esc(w)).join('');
  shell(`<div class="rsc" id="txt"><div class="rsh"><div><small>${esc(T.title)}</small><b id="rst"></b></div>${T.tr?'<button class="pru" id="rru" aria-expanded="false" aria-label="Перевод сцены">Ru</button>':''}</div>
    ${st.audio?`<div class="hear" style="--accent:${col(st.color)}">${playerHTML(st).replace('Слушать разговор','Слушать историю')}</div>`:''}
    <div class="rsl" id="rsl"></div><p class="ptx" id="rtx" hidden></p></div><div style="height:120px" aria-hidden="true"></div>`);
  if(st.audio)mountPlayer(st,$('txt'));
  dockEl.className='dock';
  dockEl.innerHTML=`<div class="in"><div class="tip idle rdt" id="tip"></div><button class="press" id="dbtn" style="--accent:${col(st.color)}"></button></div>`;
  const cur=()=>L.filter(l=>l[0]===p);
  const draw=()=>{const C=cur(),G=gl(p),nx=C[r];
    $('rst').textContent=(T.sc&&T.sc[p])||'';
    $('rsl').innerHTML=C.slice(0,r).map(l=>l[1]?`<div class="rb${l[1]==='Tom'?' me':''}">${rAva(l[1])}<div class="rbb">${tok(l[2],G)}</div></div>`:`<p class="rn">${tok(l[2],G)}</p>`).join('')+(nx&&nx[1]?`<div class="rb wait${nx[1]==='Tom'?' me':''}">${rAva(nx[1])}<div class="rbb"><i></i><i></i><i></i></div></div>`:'');
    const tip=$('tip');tip.className='tip idle rdt';tip.innerHTML=N>1?`<span class="rdots">${T.paragraphs.map((_,i)=>`<i class="${i===p?'on':''}"></i>`).join('')}</span>`:'';
    const x=$('rtx');if(x){x.hidden=true;x.textContent=T.tr?T.tr[p]||'':'';if($('rru'))$('rru').setAttribute('aria-expanded','false')}
    $('dbtn').textContent=p<N-1||r<C.length?'Дальше':'К вопросам';
    $('rsl').querySelectorAll('.tk').forEach(t=>t.onclick=()=>{
      $('rsl').querySelectorAll('.tk.on').forEach(y=>y.classList.remove('on'));t.classList.add('on');
      const tr=lookup(st,t.dataset.w,t.dataset.g),tp=$('tip');tp.className='tip';
      tp.innerHTML=`<b>${esc(t.dataset.w)}${sayBtn(t.dataset.w,'sm')}</b><span>${tr?rich(tr):'Этого слова нет в словаре урока'}</span>`;tp.appendChild(saveBtn(t.dataset.w,tr,undefined,plainTxt((t.closest('.rbb,.rn')||t).textContent)));
    });
    const last=$('rsl').lastElementChild;if(last&&r>1)last.scrollIntoView({behavior:'smooth',block:'center'})};
  const go=()=>{const C=cur();if(r<C.length){r++;return draw()}
    if(p<N-1){p++;r=1;while(p<N-1&&!cur().length)p++;draw();window.scrollTo(0,0);return}
    scnStop();readQs(st);window.scrollTo(0,0)};
  if($('rru'))$('rru').onclick=()=>{const x=$('rtx'),o=x.hidden;x.hidden=!o;$('rru').setAttribute('aria-expanded',o)};
  draw();$('dbtn').onclick=go;dockAction=go;
}
