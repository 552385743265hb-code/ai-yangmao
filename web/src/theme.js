/* Runs synchronously in <head>: saved appearance is applied before first paint.
 * The pasture palette lives in head.html; storage failure keeps this tab usable. */
(() => {
  const KEY = 'ym-theme';
  const options = [
    ['dark', '深色', '<path d="M20.5 13A8.5 8.5 0 0 1 11 3.5 8.5 8.5 0 1 0 20.5 13Z"/>'],
    ['system', '跟随系统', '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>'],
    ['light', '浅色', '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5"/>'],
  ];
  const normalize = value => value === 'light' || value === 'dark' ? value : 'system';
  const read = () => { try { return normalize(localStorage.getItem(KEY)); } catch { return 'system'; } };
  const system = matchMedia('(prefers-color-scheme: dark)');
  let preference = read();
  function syncControls() {
    document.querySelectorAll('[data-theme-choice]').forEach(button => {
      const selected = button.dataset.themeChoice === preference;
      button.setAttribute('aria-checked', String(selected));
      button.tabIndex = selected ? 0 : -1;
    });
    document.querySelectorAll('[data-theme-control]').forEach(control => {
      control.style.setProperty('--theme-index', options.findIndex(([key]) => key === preference));
    });
  }
  function apply() {
    const theme = preference === 'system' ? system.matches ? 'dark' : 'light' : preference;
    if (document.documentElement.dataset.theme !== theme) document.documentElement.dataset.theme = theme;
    document.querySelectorAll('meta[name="theme-color"]').forEach(meta => {
      meta.setAttribute('content', theme === 'dark' ? '#0e1511' : '#f1f5ee');
    });
    syncControls();
  }
  function choose(value) {
    preference = normalize(value);
    try { localStorage.setItem(KEY, preference); } catch { /* Apply in this tab even when storage is denied. */ }
    apply();
  }
  function control() {
    return `<div class="theme-switch" data-theme-control role="radiogroup" aria-label="外观" style="--theme-index:${options.findIndex(([key]) => key === preference)}"><span class="theme-thumb" aria-hidden="true"></span>${options.map(([key, label, icon]) => `<button type="button" role="radio" data-theme-choice="${key}" aria-checked="${key === preference}" tabindex="${key === preference ? 0 : -1}" title="${label}"><svg viewBox="0 0 24 24" aria-hidden="true">${icon}</svg><span class="sr">${label}</span></button>`).join('')}</div>`;
  }
  document.addEventListener('click', event => {
    const button = event.target.closest('[data-theme-choice]');
    if (button) choose(button.dataset.themeChoice);
  });
  document.addEventListener('keydown', event => {
    const button = event.target.closest('[data-theme-choice]');
    if (!button || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const buttons = [...button.closest('[data-theme-control]').querySelectorAll('[data-theme-choice]')];
    const step = ['ArrowLeft', 'ArrowUp'].includes(event.key) ? -1 : 1;
    const index = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (buttons.indexOf(button) + step + buttons.length) % buttons.length;
    choose(buttons[index].dataset.themeChoice);
    buttons[index].focus();
  });
  system.addEventListener('change', () => { if (preference === 'system') apply(); });
  window.addEventListener('storage', event => {
    if (event.key === KEY || event.key === null) { preference = read(); apply(); }
  });
  window.YMTheme = { choose, control, syncControls };
  apply();
})();
