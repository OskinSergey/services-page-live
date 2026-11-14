/* ============================================================
   Layout-guard — детектор переполнений вёрстки (для проверок).

   Активируется только параметром ?debug=1 (или #debug) в адресе.
   Находит элементы, вылезающие за ширину вьюпорта, подсвечивает их
   красной рамкой и выводит отчёт в начало страницы.
   На проде (без ?debug=1) скрипт не делает ничего.
   ============================================================ */
(function () {
  if (!/[?&]debug=1/.test(location.href)) return;

  function check() {
    const vw = document.documentElement.clientWidth;
    const bad = [];

    document.querySelectorAll('body *').forEach((el) => {
      // сам отчёт и его рамки не проверяем
      if (el.closest('.lg-report') || el.dataset.lgSkip) return;
      const r = el.getBoundingClientRect();
      if (r.width > 0 && (r.right > vw + 1 || r.left < -1)) {
        bad.push(el);
      }
    });

    // снять прежнюю подсветку
    document.querySelectorAll('[data-lg-mark]').forEach((el) => {
      el.style.outline = el.dataset.lgPrevOutline || '';
      delete el.dataset.lgPrevOutline;
    });

    if (bad.length === 0) return;

    // подсветка проблемных элементов + рамки-«границы» вьюпорта
    bad.forEach((el) => {
      el.dataset.lgPrevOutline = el.style.outline || '';
      el.style.outline = '2px solid red';
    });
    const vr = document.createElement('div');
    vr.className = 'lg-report';
    vr.style.cssText =
      'position:fixed;top:0;left:0;right:0;z-index:9999;background:#7f1d1d;color:#fff;' +
      'font:600 13px/1.4 Consolas,monospace;padding:10px 14px;white-space:pre-wrap;';
    vr.textContent =
      '[layout-guard] VW=' + vw + 'px · вылезающих элементов: ' + bad.length + '\n' +
      bad
        .slice(0, 12)
        .map((el) => {
          const r = el.getBoundingClientRect();
          return (
            el.tagName.toLowerCase() +
            (el.className && typeof el.className === 'string'
              ? '.' + el.className.trim().split(/\s+/).join('.')
              : '') +
            ' → width=' + Math.round(r.width) + ', right=' + Math.round(r.right)
          );
        })
        .join('\n');
    document.body.appendChild(vr);
  }

  window.addEventListener('load', () => {
    check();
    setTimeout(check, 1200); // повтор после полной отрисовки шрифтов/картинок
  });

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(check, 300);
  });
})();
