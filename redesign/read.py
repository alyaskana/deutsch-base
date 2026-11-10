# ---------- 2g. Чтение «Рассказ»: текст открывается по абзацу, прочитанное бледнеет ----------
import re
NEW=r"""function runRead(st){
  if(PEND&&PEND.ii>0)return readQs(st);
  shell(`<div class="card rdc" id="txt">${st.audio?`<div class="hear" style="--accent:${col(st.color)}">${playerHTML(st).replace('Слушать разговор','Слушать историю')}</div>`:''}${storyHTML(st)}</div><div style="height:90px" aria-hidden="true"></div>`);
  if(st.audio)mountPlayer(st,$('txt'));
  const root=$('txt'),PS=[...root.querySelectorAll('.story>p:not(.ptx):not(.cap)')],N=PS.length;let k=0;
  dockEl.className='dock';
  dockEl.innerHTML=`<div class="in"><div class="tip idle rdt" id="tip"></div><button class="press" id="dbtn" style="--accent:${col(st.color)}"></button></div>`;
  const draw=()=>{PS.forEach((p,i)=>{p.classList.toggle('rdh',i>k);p.classList.toggle('rdp',i<k);const x=p.nextElementSibling;if(x&&x.classList.contains('ptx')&&i>k)x.hidden=true});
    const tip=$('tip');if(tip&&tip.classList.contains('idle'))tip.innerHTML=N>1?`<span>абзац ${k+1} из ${N}</span>`:'';
    $('dbtn').textContent=k<N-1?'Дальше':'К вопросам'};
  const go=()=>{if(k<N-1){k++;const tip=$('tip');tip.className='tip idle rdt';root.querySelectorAll('.tk.on').forEach(x=>x.classList.remove('on'));draw();PS[k].scrollIntoView({behavior:'smooth',block:'center'});return}
    scnStop();readQs(st);window.scrollTo(0,0)};
  draw();$('dbtn').onclick=go;dockAction=go;
  root.querySelectorAll('.tk').forEach(t=>t.onclick=()=>{
    root.querySelectorAll('.tk.on').forEach(x=>x.classList.remove('on'));t.classList.add('on');
    const tr=lookup(st,t.dataset.w,t.dataset.g),tip=$('tip');tip.className='tip';
    tip.innerHTML=`<b>${esc(t.dataset.w)}${sayBtn(t.dataset.w,'sm')}</b><span>${tr?rich(tr):'Этого слова нет в словаре урока'}</span>`;tip.appendChild(saveBtn(t.dataset.w,tr,undefined,ctxOf(t)));
  });
}
"""
def patch(s):
    M='function runRead(st){';assert s.count(M)==1
    i=s.index(M);m=re.compile(r'^\}\n',re.M).search(s,i)
    return s[:i]+NEW+s[m.end():]
