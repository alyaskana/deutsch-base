# Ночной автотест «Mein Deutsch»

Пишет ежедневная «Синхронизация deutsch-base» (шаг 3d в automation/sync.md). Найденное разбирается утром.

2026-11-14 (до переноса, из треда книги, v130): падают tp-wl0 и tp-wl5 — тест слов репетитора, «урок застрял на этапе choice», JS «Cannot set properties of null (setting textContent)».

2026-11-14 (ночной прогон, версия страницы 1794621476-53c6, 303 урока): 3 урока с проблемами, остальные прошли.
- ✗ book-16-P: урок застрял на этапе «type» (действие pick:.opt:not(.sel)); ошибка JS: Cannot set properties of null (setting 'textContent')
- ✗ book-22-5: урок застрял на этапе «choice» (действие pick:.opt:not(.sel)); ошибка JS: Cannot set properties of null (setting 'textContent')
- ✗ book-28-C: урок не дошёл до финала (1001 шагов); ошибка JS: Cannot set properties of null (setting 'textContent')
Заметка: полный прогон занял около 28 минут.
