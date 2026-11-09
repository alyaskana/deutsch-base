# Озвучка «Mein Deutsch» и «Artikelregen»

Голос новых записей (с 2026-11-08): ElevenLabs, голос «Adrian» (`X3GmkxFRIWulRy3Eaur7`), модель `eleven_multilingual_v2`. Запуск: `TTS_ENGINE=eleven TTS_VOICE_ID=X3GmkxFRIWulRy3Eaur7 TTS_THREADS=4 python3 scripts/tts/gen.py …`. Подписка ElevenLabs временная: если API ElevenLabs отвечает ошибкой оплаты, лимита или доступа, озвучивай как раньше через OpenAI (без `TTS_ENGINE`, голос `marin`).
Старые записи сделаны OpenAI `gpt-4o-mini-tts`, голос `marin`; часть уже заменена Адрианом. Ключи лежат в секретах облачной среды (Network secret для `api.openai.com` и `api.elevenlabs.io`), прокси подставляет их сам, в коде и в репозитории ключей нет.
Перезаписать готовые клипы новым голосом: `pack.py … --replace hashes.json` кладёт их в новые документы, старые документы не трогает. Копия индекса только с голосом GPT: /mnt/project-files/tts/index-backup/.

Звук хранится в базе каждой страницы, коллекция `audio`:
- `_index` — `{v, voice, at, m: {hash: docId}}`;
- `<группа>.<n>` — `{c: {hash: mp3 в base64}}`, до ~240 КБ на документ (ArtifactData пишет не больше 256 КБ на документ, batch — до 1 МБ, то есть по 4 документа). Группа — id урока, `_dict` (словарь), `_saved` (её сохранённые слова), `_ar` (слова Artikelregen).

`hash` — `ahash(akey(текст))` из `akey.py`, такой же код в страницах (`akey`, `ahash`). Страница ищет клип по тексту, который озвучивает; нет клипа — в «Mein Deutsch» читает системный голос, в Artikelregen молчит.

## Как озвучить новое (порядок для задачи «Пополнение в Mein Deutsch»)

1. ArtifactData «Mein Deutsch» (https://claude.ai/artifact/EF22N3Wk3vb8Fdau9keTS7): `list` коллекции `lessons` и `get` документа `progress` в коллекции `data/users/me` с `out_dir=<dir>/db`; `get` `audio/_index` с `out_dir=<dir>/idx` (документа нет — начни с `{"m":{}}`).
2. `python3 scripts/tts/collect.py <dir>/db <dir>/texts.json`
3. `python3 -c` или вручную: из `_index.json` взять `m` в `<dir>/have.json`.
   `python3 scripts/tts/gen.py <dir>/texts.json <dir>/clips --have <dir>/have.json --report <dir>/report.json`
4. Проверка (редактор-носитель): в `report.json` клипы, где распознавание услышало не то. Отдельные слова распознаются хуже, там это часто шум. Предложения и всё, где услышано другое слово, переслушать по смыслу: если слово действительно произнесено неверно, удалить mp3 и сгенерировать снова; не выходит — убрать текст из `texts.json` (останется системный голос). Несуществующие формы, которые стоят в уроках как неверные варианты (например, ziehte, begonn в drei-formen), не озвучивать: убрать их из `texts.json`.
5. `TTS_VOICE=marin python3 scripts/tts/pack.py <dir>/texts.json <dir>/clips <dir>/out --index <dir>/idx/audio/_index.json`
6. Записать в коллекцию `audio` все новые `out/<группа>.<n>.json` (batch, `set`, новые документы без if_version) и затем `out/_index.json` в `_index` (`set` с if_version, если документ был).
7. «Artikelregen» (https://claude.ai/artifact/YQinY1gBWqetVFHmACmRVm): то же с `collect_ar.py` по коллекции `extra_words` и своим `audio/_index`.

Ничего не озвучилось нового — ничего не писать.

Когда что звучит само (v54): реплика собеседника в диалоге звучит при появлении задания, после ответа звучит только ответная реплика, а не весь диалог; то, что уже прозвучало при показе, после ответа не повторяется. Поэтому `collect.py` озвучивает реплики диалогов (`l` и `y` с ответом) отдельно.
