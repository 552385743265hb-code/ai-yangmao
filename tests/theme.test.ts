import { existsSync, readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import { parseHTML } from 'linkedom';
import { describe, expect, it } from 'vitest';

// Exercise the actual pre-paint script with browser storage and system changes.
function fixture(saved: string | null = null, dark = false, blocked = false) {
  const { window, document } = parseHTML('<html><head><meta name="theme-color"></head><body></body></html>');
  const storage = new Map(saved === null ? [] : [['ym-theme', saved]]);
  let onSystemChange = () => {};
  const media = { matches: dark, addEventListener: (_: string, fn: () => void) => { onSystemChange = fn; } };
  const context = createContext({ window, document, matchMedia: () => media,
    localStorage: {
      getItem: (key: string) => { if (blocked) throw Error('denied'); return storage.get(key) ?? null; },
      setItem: (key: string, value: string) => { if (blocked) throw Error('denied'); storage.set(key, value); },
    },
  });
  runInContext(existsSync('web/src/theme.js') ? readFileSync('web/src/theme.js', 'utf8') : '', context);
  return { window, document, storage, changeSystem(value: boolean) { media.matches = value; onSystemChange(); } };
}

describe('pasture appearance', () => {
  it('applies the saved light choice before paint even on a dark system', () => {
    const f = fixture('light', true);
    expect(f.document.documentElement.dataset.theme).toBe('light');
    expect(f.document.querySelector('meta')!.getAttribute('content')).toBe('#f1f5ee');
    f.changeSystem(false); f.changeSystem(true);
    expect(f.document.documentElement.dataset.theme).toBe('light');
  });
  it('follows system changes again after returning from an explicit choice', () => {
    const f = fixture('dark');
    f.window.YMTheme?.choose('system');
    expect(f.document.documentElement.dataset.theme).toBe('light');
    f.changeSystem(true);
    expect(f.document.documentElement.dataset.theme).toBe('dark');
    expect(f.storage.get('ym-theme')).toBe('system');
  });
  it('keeps a manual choice usable when browser storage is denied', () => {
    const f = fixture(null, true, true);
    f.window.YMTheme?.choose('light');
    f.changeSystem(false); f.changeSystem(true);
    expect(f.document.documentElement.dataset.theme).toBe('light');
  });
  it('treats invalid stored preferences as system and syncs controls across tabs', () => {
    const f = fixture('invalid', true);
    expect(f.document.documentElement.dataset.theme).toBe('dark');
    f.document.body.innerHTML = f.window.YMTheme?.control() ?? '';
    f.window.YMTheme?.syncControls();
    expect(f.document.querySelector('[data-theme-choice="system"]')?.getAttribute('aria-checked')).toBe('true');
    f.storage.set('ym-theme', 'light');
    const event = new f.window.Event('storage');
    Object.assign(event, { key: 'ym-theme' });
    f.window.dispatchEvent(event);
    expect(f.document.documentElement.dataset.theme).toBe('light');
    expect(f.document.querySelector('[data-theme-choice="light"]')?.getAttribute('aria-checked')).toBe('true');
  });
});
