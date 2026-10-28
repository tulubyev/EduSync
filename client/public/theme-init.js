// Тема до отрисовки страницы (#45): без вспышки светлого фона при тёмной теме. Логика — как в src/theme.ts.
(function () {
  try {
    var saved = localStorage.getItem('myepa-theme');
    var theme = saved === 'light' || saved === 'dark' || saved === 'system' ? saved : 'system';
    var dark = theme === 'dark' || (theme === 'system' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (dark) document.documentElement.classList.add('dark');
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
  } catch (e) {
    // localStorage недоступен — светлая тема
  }
})();
