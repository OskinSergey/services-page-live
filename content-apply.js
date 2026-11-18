/* ============================================================
   content-apply.js — применение правок из прототипа админки (#6)
   + черновик CMS-админки admin/ (этап 1, локальная приёмка)

   РЕЖИМЫ:
   1) Обычный режим (legacy, admin.html прототип): читает JSON из
      localStorage (servicesContent) и подставляет в [data-content].
   2) Режим предпросмотра черновика (?draft=1 в адресе): читает
      draft_site_content (формат { content, media, settings, savedAt })
      от MVP-админки Vue (localhost:5174). Приоритет источников:
      #draft=<JSON> в адресе (хэш-передача с другого origin) ->
      localStorage текущего origin -> ничего (дефолт из разметки).
      Хэш-черновик сохраняется в localStorage, чтобы перезагрузка
      ?draft=1 без хэша показывала то же самое.

   Без сохранённых правок скрипт ничего не делает — сайт показывает
   дефолт из разметки App.jsx. Хранение локальное: правки видны
   только в этом браузере (этап 2 — Supabase, issue #9).

   Тайминг: скрипт defer-ится раньше монтирования React, поэтому
   при первой попытке маркеров может не быть — ждём через
   MutationObserver до ~5 с (фолбэк: тихо выходим).

   Защита от дурака:
   - ключи *.eyebrow: декоративный префикс «// » добавляется
     автоматически, введённый пользователем «//» срезается;
   - теги (<b> и пр.) в значения не попадают — оформление
     живёт в разметке (data-элементы-обёртки).
   ============================================================ */
(function () {
  var EYEBROW_RE = /\.eyebrow$/;
  var LEGACY_KEY = 'servicesContent';
  var DRAFT_KEY = 'draft_site_content';
  var WAIT_TIMEOUT_MS = 5000;

  function clean(value, key) {
    let v = String(value);
    if (EYEBROW_RE.test(key)) {
      v = v.replace(/^\/\/\s*/, ''); // префикс // добавим сами
    }
    return v;
  }

  /* Черновик активен только при ?draft=1 (кнопка «Открыть сайт
     с черновиком» админки ведёт именно на такой адрес). */
  function isDraftMode() {
    return /[?&]draft=1/.test(window.location.search);
  }

  /* Какие правки накладывать в этом запуске (или null — не трогать сайт) */
  function resolveOverrides() {
    if (!isDraftMode()) {
      // legacy: прототип admin.html писал плоскую карту servicesContent
      try {
        return JSON.parse(localStorage.getItem(LEGACY_KEY) || 'null');
      } catch (e) {
        return null;
      }
    }
    // 1) хэш-передача: #draft=<encodeURIComponent(JSON черновика)>
    var hashMatch = window.location.hash.match(/#draft=([^&]+)/);
    if (hashMatch) {
      try {
        var parsed = JSON.parse(decodeURIComponent(hashMatch[1]));
        var payload = parsed && typeof parsed === 'object' && parsed.content ? parsed : { content: parsed, savedAt: new Date().toISOString() };
        if (payload && payload.content && typeof payload.content === 'object') {
          // зеркалим на origin сайта (:4173): перезагрузка без хэша покажет то же
          localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
          return payload.content;
        }
      } catch (e) {
        console.warn('[content-apply] не удалось разобрать #draft — пробую localStorage', e);
      }
    }
    // 2) черновик, уже сохранённый на этом origin
    try {
      var saved = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
      if (!saved) return null;
      return saved.content && typeof saved.content === 'object' ? saved.content : saved;
    } catch (e) {
      return null;
    }
  }

  /* Одна попытка наложения; возвращает { applied, missing } */
  function applyOnce(data) {
    let applied = 0;
    let missing = 0;
    Object.entries(data).forEach(([key, value]) => {
      const el = document.querySelector('[data-content="' + key + '"]');
      if (!el) {
        missing++;
        return;
      }
      const v = clean(value, key);
      if (EYEBROW_RE.test(key)) {
        el.textContent = '// ' + v;
      } else {
        el.textContent = v; // безопасно: только текст, HTML-теги невозможны в принципе
      }
      applied++;
    });
    return { applied: applied, missing: missing };
  }

  function report(applied, isDraft) {
    if (applied) {
      console.info('[content-apply] применено правок: ' + applied + (isDraft ? ' (черновик, ?draft=1)' : ''));
    }
  }

  try {
    const data = resolveOverrides();
    if (!data || typeof data !== 'object') return;
    const isDraft = isDraftMode();
    const first = applyOnce(data);
    if (!first.missing) {
      report(first.applied, isDraft);
      return;
    }
    // React ещё не смонтировался (defer раньше рендера) — ждём появления маркеров
    var done = false;
    var finish = function (applied) {
      if (done) return;
      done = true;
      observer.disconnect();
      report(applied, isDraft);
    };
    var observer = new MutationObserver(function () {
      var res = applyOnce(data);
      if (!res.missing) finish(res.applied);
      else if (res.applied > 0) report(res.applied, isDraft); // частичное применение логируем один раз на вызов
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    setTimeout(function () {
      var res = applyOnce(data);
      finish(res.applied);
    }, WAIT_TIMEOUT_MS);
  } catch (e) {
    console.warn('[content-apply]', e);
  }
})();
