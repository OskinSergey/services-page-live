/* ============================================================
   content-apply.js — применение правок из прототипа админки (#6)

   Читает JSON из localStorage (servicesContent) и подставляет
   значения в элементы с data-content="ключ". Без сохранённых
   правок скрипт ничего не делает — сайт показывает дефолт
   из index.html. Хранение локальное: правки видны только
   в этом браузере (этап 2 — Supabase, issue #9).

   Защита от дурака:
   - ключи *.eyebrow: декоративный префикс «// » добавляется
     автоматически, введённый пользователем «//» срезается;
   - теги (<b> и пр.) в значения не попадают — оформление
     живёт в разметке (data-элементы-обёртки).
   ============================================================ */
(function () {
  const EYEBROW_RE = /\.eyebrow$/;

  function clean(value, key) {
    let v = String(value);
    if (EYEBROW_RE.test(key)) {
      v = v.replace(/^\/\/\s*/, ''); // префикс // добавим сами
    }
    return v;
  }

  try {
    const data = JSON.parse(localStorage.getItem('servicesContent') || 'null');
    if (!data) return;
    let applied = 0;
    Object.entries(data).forEach(([key, value]) => {
      const el = document.querySelector('[data-content="' + key + '"]');
      if (!el) return;
      const v = clean(value, key);
      if (EYEBROW_RE.test(key)) {
        el.textContent = '// ' + v;
      } else {
        el.textContent = v; // безопасно: только текст, HTML-теги невозможны в принципе
      }
      applied++;
    });
    if (applied) console.info('[content-apply] применено правок: ' + applied);
  } catch (e) {
    console.warn('[content-apply]', e);
  }
})();
