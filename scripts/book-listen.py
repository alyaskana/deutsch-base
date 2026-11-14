#!/usr/bin/env python3
"""Аудио-упражнения книги: этапы listen + script в book-NN-P.json и audio-доки scene.<id>.<k>.

  python3 scripts/hoer/render.py data/book/listen/<id>.scene.json RENDER_DIR   # озвучка (ElevenLabs)
  python3 scripts/book-listen.py RENDER_DIR UNITS_DIR AUDIO_OUT

Вопросы и пояснения (по ключу книги) лежат в SPEC ниже; реплики — в data/book/listen/."""
import json,base64,re,os,sys
R=sys.argv[1]; BP=sys.argv[2]; OUT=sys.argv[3]; os.makedirs(OUT,exist_ok=True)
LIMIT=240000
def k_of(lines,n):
    f=re.sub(r'<[^>]+>','',n).replace('…','').strip(' .!?')
    for i,l in enumerate(lines):
        if f.lower() in l['de'].lower(): return i
    sys.exit('no line for '+n)
SPEC={
'book-06-4':dict(file='book-06-P.json',after='Упражнение 06.3',title='Упражнение 06.4',scene='Im Laden',cap='Покупательница в мясной лавке',
 sub='Послушайте другую покупательницу и отвечайте по пунктам книги.',speakers={'Kundin':'Австрия','Verkäufer':'Саксония'},
 qs=[('Что она покупает?',['Schinken','Käse','Wurst'],'<b>Schinken</b>, bitte.','Покупательница заказывает ветчину.'),
     ('Сколько?',['300 Gramm','3 Kilo','200 Gramm'],'<b>Dreihundert Gramm</b> Schinken','После числа мера остаётся <b>Gramm</b>.'),
     ('Для кого покупка?',['für die Kinder','für den Mann','für Paul'],'ist <b>für die Kinder</b>','Получатель назван после <b>für</b>.'),
     ('Без чего она просит покупку?',['ohne Tüte','ohne Brot','ohne Fett'],'<b>Ohne Tüte</b>, bitte','В записи звучит сочетание <b>ohne Tüte</b>.'),
     ('Чего у продавца нет?',['Fisch','Schinken','Tüten'],'wir haben <b>keinen Fisch</b>','Отсутствие рыбы выражено через <b>keinen Fisch</b>.'),
     ('Где находится другой магазин?',['gleich um die Ecke','gegenüber vom Markt','durch den Park'],'gleich <b>um die Ecke</b>','Сочетание означает «прямо за углом».')],
 gloss={'schinken':'ветчина (der Schinken)','gramm':'грамм (das Gramm)','tüte':'пакет (die Tüte)','laden':'магазин, лавка (der Laden)','ecke':'угол (die Ecke)','bar':'наличными','kostet':'стоит (kosten)','verkauft':'продаёт (verkaufen)'}),
'book-15-5':dict(file='book-15-P.json',after='Упражнение 15.4',title='Упражнение 15.5',scene='Im Wohnzimmer',cap='Йонас звонит маме',
 sub='Гостиную переставили, Йонас описывает её маме по телефону. Где стоит каждый предмет?',speakers={'Jonas':'Германия'},
 qs=[('die Lampe',['справа от окна','под столом','на стеллаже'],'Die Lampe steht <b>neben dem Fenster</b>','<b>neben dem Fenster</b>, rechts: лампа стоит справа от окна.'),
     ('der Teppich',['на полу перед диваном','на стене над диваном','под столом'],'Der Teppich liegt <b>vor dem Sofa</b>','<b>vor dem Sofa</b>: ковёр лежит перед диваном.'),
     ('der Spiegel',['на стене над диваном','справа от окна','между дверью и стеллажом'],'Der Spiegel hängt <b>über dem Sofa</b>','<b>über dem Sofa</b>: зеркало висит над диваном.'),
     ('die Kiste',['под столом','на стеллаже','перед диваном'],'Die Kiste steht <b>unter dem Tisch</b>','<b>unter dem Tisch</b>: ящик стоит под столом.'),
     ('der Stuhl',['между дверью и стеллажом','справа от окна','под столом'],'Der Stuhl steht <b>zwischen der Tür und dem Regal</b>','<b>zwischen der Tür und dem Regal</b>: стул между дверью и стеллажом.'),
     ('die Zeitung',['на стеллаже сверху','на полу перед диваном','на стене над диваном'],'Die Zeitung liegt <b>auf dem Regal</b>','<b>auf dem Regal</b>: газета лежит на стеллаже.')],
 gloss={'teppich':'ковёр (der Teppich)','spiegel':'зеркало (der Spiegel)','kiste':'ящик (die Kiste)','regal':'стеллаж (das Regal)','zeitung':'газета (die Zeitung)','hängt':'висит (hängen)','platz':'место (der Platz)','wohnzimmer':'гостиная (das Wohnzimmer)'}),
}
for sid,sp in SPEC.items():
    sc=json.load(open(f'data/book/listen/{sid}.scene.json')); rd=R
    meta=json.load(open(f'{rd}/{sid}.json')); b=base64.b64encode(open(f'{rd}/{sid}.mp3','rb').read()).decode()
    parts=[b[i:i+LIMIT] for i in range(0,len(b),LIMIT)]
    for k,p in enumerate(parts): json.dump({'b':p,'n':len(parts)},open(f'{OUT}/scene.{sid}.{k}.json','w'))
    lines=[{'who':l['who'],'de':l['de'],'ru':l['ru']} for l in sc['lines']]
    st=[{'type':'listen','title':sp['title'],'scene':sp['scene'],'cap':sp['cap'],'color':'blue','shape':'cloud','mins':2,'sub':sp['sub'],
         'audio':{'id':sid,'n':len(parts),'dur':meta['dur'],'t':meta['t']},'speakers':sp['speakers'],'lines':lines,'gloss':sp['gloss'],
         'items':[{'q':q,'o':o,'a':o[0],'n':f'{quote}. {ex}','k':k_of(lines,quote)} for q,o,quote,ex in sp['qs']]},
        {'type':'script','title':'Текст записи '+sp['title'][-4:],'color':'blue','shape':'cloud','items':[],'sub':'Послушай ещё раз и следи по тексту. Кнопка у реплики повторяет только её.'}]
    f=f"{BP}/{sp['file']}"; d=json.load(open(f))
    d['stages']=[s for s in d['stages'] if s.get('audio',{}).get('id')!=sid and s.get('title')!='Текст записи '+sp['title'][-4:]]
    i=[s['title'] for s in d['stages']].index(sp['after'])+1
    d['stages'][i:i]=st; json.dump(d,open(f,'w'),ensure_ascii=False)
    print(sid,len(parts),[s['title'] for s in d['stages']])
