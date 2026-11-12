// node patch.cjs in.html artikel.json out.html — встраивает «Род слова» в Mein Deutsch
const fs=require('fs');const [,,inp,art,out]=process.argv;let h=fs.readFileSync(inp,'utf8');
const js=fs.readFileSync(__dirname+'/rod.js','utf8'),css=fs.readFileSync(__dirname+'/rod.css','utf8'),A=fs.readFileSync(art,'utf8').trim();
const rep=(a,b,label)=>{const n=h.split(a).length-1;if(n!==1)throw new Error(label+': найдено '+n);h=h.replace(a,()=>b)};
if(h.includes('v114: «Род слова»'))throw new Error('уже встроено');
// 1. данные: один источник (build/artikel.json), GD строится из него
const i0=h.indexOf('const GD={"G":');if(i0<0)throw new Error('GD');const i1=h.indexOf('\n',i0);
h=h.slice(0,i0)+'let ARD='+A.replace(/<\//g,'<\\/')+';\nlet GD=gdFrom(ARD);function gdFrom(a){const G={};a.W.forEach(x=>G[x[0]]=x[1]);return {G,H:a.H,R:a.R}}'+h.slice(i1);
// 2. свежая копия из базы lessons/_artikel
rep("{const gd=snap.docs.find(d=>d.id==='_grammar');","{const ad=snap.docs.find(d=>d.id==='_artikel');let v=null;try{const r=ad&&ad.data();v=r&&r.j?JSON.parse(r.j):r}catch(e){}if(v&&Array.isArray(v.W)&&Array.isArray(v.R)&&v.R.length>=43&&JSON.stringify([v.at,v.W.length,v.R.length])!==JSON.stringify([ARD.at,ARD.W.length,ARD.R.length])){ARD=v;GD=gdFrom(v);GRX=null}}\n      {const gd=snap.docs.find(d=>d.id==='_grammar');",'snapshot');
// 3. слияние прогресса: игра в артикли и игры на главной
rep("  p.saved=Object.values(SV)","  {const a=p.art||{w:{}},b=r.art||{w:{}},W={...(b.w||{})};for(const k in (a.w||{}))if(!W[k]||(a.w[k].t||0)>=(W[k].t||0))W[k]=a.w[k];if(p.art||r.art)p.art={w:W,best:Math.max(a.best||0,b.best||0),rounds:Math.max(a.rounds||0,b.rounds||0)}}\n  if(r.games)p.games={...r.games,...(p.games||{})};\n  p.saved=Object.values(SV)",'merge');
// 4. вкладка «Слова» подсвечена на экране «Род слова»
rep("view==='vocab'?'vocab'","(view==='vocab'||view==='rod')?'vocab'",'tabs');
// 5. плитки der/die/das на «Словах» открывают «Род слова»
rep('<button class="vart ${a}" data-v="art:${a}">','<button class="vart ${a}" data-rod="${a}">','vart');
// 6. «Тренировать» в «Пять минут»
rep('<button class="mgame pr" id="go-pairs">','<button class="mgame ar" data-rg="menu"><span class="art-t"><b>Тренировать</b><span class="rec">${(S.progress.art&&S.progress.art.best)?`<em>${S.progress.art.best}</em> рекорд`:\'der, die, das\'}</span></span><span class="ardrops" aria-hidden="true"><i></i><i></i><i></i></span></button>\n    <button class="mgame pr" id="go-pairs">','games');
// 6б. «На что налечь» в обзоре недели: action "artikelregen" открывает «Тренировать» в приложении
rep("const TRAINERS={artikelregen:{n:'Artikelregen',u:'https://claude.ai/artifact/YQinY1gBWqetVFHmACmRVm'}};","const TRAINERS={artikelregen:{n:'Тренировать',u:'#rg'},artikel:{n:'Тренировать',u:'#rg'}};",'trainers');
// 6b. карточка слова в словаре: путаешь ли род в «Тренировать»
rep("${e.st==='s'?'<p class=\"wnote\">Недавно","${rgWordNote(e)}${e.st==='s'?'<p class=\"wnote\">Недавно",'wordnote');
// 7. код и стили
const last=h.lastIndexOf('</script>');h=h.slice(0,last)+'\n'+js+'\n'+h.slice(last);
/* стили — в первый <style> страницы после <title>: обёртка до <title> при публикации отбрасывается */
const st=h.indexOf('</style>',h.indexOf('<title>'));h=h.slice(0,st)+'\n'+css+'\n'+h.slice(st);
fs.writeFileSync(out,h);console.log('ok',h.length);
