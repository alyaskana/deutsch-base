# ---------- 2g. «Разбор ошибок»: что ответила, как правильно, почему; всё видно сразу ----------
JS=r"""/* ошибка для разбора: что ответила, как правильно и почему */
function mistMine(){const T=document.querySelector('.task');if(!T)return '';
  const v=[...T.querySelectorAll('input.field,textarea.field,.w1gap input')].map(e=>(e.value||'').trim()).filter(Boolean);if(v.length)return v.join(' … ');
  const s=[...T.querySelectorAll('.opt.sel,.ph.sel,.w1tok.sel,.ev.set')].map(e=>e.textContent.trim()).filter(Boolean);if(s.length)return s.join(', ');
  return [...T.querySelectorAll('.lines .tile')].map(e=>e.textContent.trim()).join(' ')}
function mistOf(r,mine){const d=document.createElement('div');d.innerHTML=r.body||'';const why=(d.textContent||'').replace(/\s+/g,' ').trim();
  return `${mine?`<span class="mxm">${esc(mine.slice(0,120))}</span>`:''}<span class="mxr">${r.mist}</span>${why?`<span class="mxw">${esc(why.slice(0,240))}</span>`:''}`}
"""
def patch(s):
    a="const r=sp.check(it);mountTr(it,tst,true);if(!it._re){if(r.right)ok++;else mist.push(r.mist);"
    assert s.count(a)==1
    s=s.replace(a,"const mine=mistMine(),r=sp.check(it);mountTr(it,tst,true);if(!it._re){if(r.right)ok++;else mist.push(mistOf(r,mine));")
    a="""<div class="mlist">${m.slice(0,4).map(x=>`<div>${x}</div>`).join('')}</div>${m.length>4?`<details class="more"><summary>Ещё ${m.length-4}</summary><div class="mlist">${m.slice(4).map(x=>`<div>${x}</div>`).join('')}</div></details>`:''}</div>`}).join('');"""
    assert s.count(a)>=1
    s=s.replace(a,"""<div class="mlist">${m.map(x=>`<div>${x}</div>`).join('')}</div></div>`}).join('');""")
    a="/* ---------- final screen with mistake review ---------- */"
    assert s.count(a)>=1
    i=s.index(a);s=s[:i]+JS+s[i:]
    return s
