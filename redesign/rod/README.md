# «Род слова» и «Тренировать» в Mein Deutsch (v114, 2026-11-12)

Перенос Artikelregen по утверждённому макету Г (https://claude.ai/artifact/YPdMtxPZYEk9BFmSmgd5ju).

- `rod.js`, `rod.css` — код экрана «Род слова» (поиск, таблица окончаний, карточка правила листом) и игры «Тренировать».
- `patch.cjs` — встраивает их в страницу: `node patch.cjs mein-deutsch.html ../../build/artikel.json out.html`.
  Заменяет встроенную копию правил (GD) на build/artikel.json, читает свежую копию из `lessons/_artikel`,
  сливает `progress.art`, ведёт плитки der/die/das на «Словах» в «Род слова», добавляет плитку в «Пять минут».
- Данные: `data/artikel/*.json` → `scripts/artikel.mjs` → `build/artikel.json` → документ `_artikel` в коллекции `lessons`.
- Прогресс игры: `progress.art = {w: {слово: {ok, bad, t, iv, d, lapse}}, best, rounds}`; перенесён из Artikelregen 2026-11-12,
  резервные копии в /mnt/project-files/artikelregen/backup-2026-11-12/.
- Автотест: `npm run smoke` (раздел «род слова»).
