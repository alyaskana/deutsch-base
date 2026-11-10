window.planConcept=function(v){
  const P=document.querySelector('.mplan');const steps=[...P.querySelectorAll('[data-step]')];
  document.querySelectorAll('style.pcs').forEach(x=>x.remove());const st=document.createElement('style');st.className='pcs';document.body.appendChild(st);
  const CH='<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 10.5l3.6 3.6 7.4-8.2"/></svg>';
  const cur=steps.findIndex(s=>!s.classList.contains('ok'));
  const wrap=document.createElement('div');wrap.className='pgrp';P.insertBefore(wrap,steps[0]);
  steps.forEach((s,i)=>{const w=document.createElement('div');w.className='stp '+(i<cur?'dn':i===cur?'cu':'nx');w.innerHTML=`<span class="nd">${i<cur?CH:i+1}</span>`;wrap.appendChild(w);w.appendChild(s)});
  if(v==='A')st.textContent=`
   .pgrp{position:relative;display:flex;flex-direction:column;gap:12px;padding-left:40px}
   .pgrp:before{content:"";position:absolute;left:14px;top:28px;bottom:32px;width:4px;border-radius:2px;background:repeating-linear-gradient(to bottom,#D8CFC2 0 6px,transparent 6px 12px)}
   .stp{position:relative}
   .nd{position:absolute;left:-40px;top:50%;margin-top:-16px;width:32px;height:32px;border-radius:50%;display:grid;place-items:center;font-family:var(--display);font-weight:600;font-size:15px;background:#F4EFE8;color:#857E9F;box-shadow:inset 0 0 0 3px #D8CFC2;z-index:1}
   .stp.dn .nd{background:#0E8A5E;color:#fff;box-shadow:none}.nd svg{width:16px;height:16px}
   .stp.cu .nd{background:#7444E6;color:#fff;box-shadow:0 0 0 5px rgba(116,68,230,.18)}
   .pgrp .mrow.ok>i{display:none}.pgrp .mrow.ok{background:#fff;box-shadow:0 4px 0 #E0D8CC}.pgrp .mrow.ok b{color:#0B6B49}
   .pgrp .mles{min-height:210px}`;
  if(v==='B'){const h=document.createElement('div');h.className='pgh';h.innerHTML=`<b>План на сегодня</b><span>${steps.map((_,i)=>`<i class="${i<cur?'on':i===cur?'cu':''}"></i>`).join('')}</span>`;wrap.prepend(h);
   st.textContent=`
   .pgrp{display:flex;flex-direction:column;gap:10px;background:#E9E1D4;border-radius:38px;padding:16px 12px 12px}
   .pgh{display:flex;align-items:center;justify-content:space-between;padding:0 10px 4px}
   .pgh b{font-family:var(--display);font-weight:600;font-size:19px;color:#2B2440}
   .pgh span{display:flex;gap:5px}.pgh i{width:26px;height:8px;border-radius:4px;background:#D3C9BA}.pgh i.on{background:#0E8A5E}.pgh i.cu{background:#7444E6}
   .nd{display:none}
   .pgrp .mrow{box-shadow:none}.pgrp .mles{box-shadow:none;min-height:214px}
   .stp.nx{opacity:.92}`}
  if(v==='C'){st.textContent=`
   .pgrp{position:relative;display:flex;flex-direction:column;gap:26px;padding:6px 0}
   .stp{position:relative;width:84%}.stp:nth-child(even){align-self:flex-end}.stp.cu{width:90%}
   .pgrp svg.pth{position:absolute;inset:0;width:100%;height:100%;z-index:0;overflow:visible}
   .stp>button{position:relative;z-index:1}
   .nd{position:absolute;z-index:2;top:-12px;left:-6px;width:34px;height:34px;border-radius:50%;display:grid;place-items:center;font-family:var(--display);font-weight:600;font-size:15px;background:#fff;color:#857E9F;box-shadow:0 3px 0 #E0D8CC}
   .stp:nth-child(even) .nd{left:auto;right:-6px}
   .stp.dn .nd{background:#0E8A5E;color:#fff;box-shadow:0 3px 0 #0A6A48}.nd svg{width:16px;height:16px}
   .stp.cu .nd{background:#7444E6;color:#fff;box-shadow:0 3px 0 #5129B8}
   .pgrp .mrow.ok>i{display:none}.pgrp .mles{min-height:204px}`;
   const R=wrap.getBoundingClientRect(),pts=[...wrap.querySelectorAll('.stp')].map(s=>{const r=s.getBoundingClientRect();return [r.left+r.width/2-R.left,r.top-R.top,r.bottom-R.top]});
   let d='';for(let i=0;i<pts.length-1;i++){const a=pts[i],b=pts[i+1],y1=a[2]-10,y2=b[1]+10,m=(y1+y2)/2;d+=`M${a[0]} ${y1} C${a[0]} ${m+18} ${b[0]} ${m-18} ${b[0]} ${y2}`}
   const s=document.createElementNS('http://www.w3.org/2000/svg','svg');s.setAttribute('class','pth');s.innerHTML=`<path d="${d}" fill="none" stroke="#CFC5B6" stroke-width="5" stroke-linecap="round" stroke-dasharray="2 12"/>`;wrap.prepend(s)}
  window.scrollTo(0,0);
};
