export type Theme = 'light' | 'dark' | 'system';

const KEY = 'tracker:theme';
export const THEMES: Theme[] = ['light', 'dark', 'system'];
export const THEME_LABEL: Record<Theme, string> = { light: 'Light', dark: 'Dark', system: 'System' };

/** Defaults to light. Stored on this device only (not part of backups). */
export function getTheme(): Theme {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' || v === 'system' ? v : 'light';
  } catch {
    return 'light';
  }
}

/** 'system' removes the override so the phone's setting applies (see theme/tokens.css). */
export function applyTheme(t: Theme = getTheme()): void {
  const el = document.documentElement;
  if (t === 'system') el.removeAttribute('data-theme');
  else el.setAttribute('data-theme', t);
}

export function setTheme(t: Theme): void {
  try {
    localStorage.setItem(KEY, t);
  } catch {
    /* ignore */
  }
  applyTheme(t);
}
