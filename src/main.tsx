import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { backfillSnapshots } from './db/repo';
import { seedIfEmpty } from './db/seed';
import { ensureInstalledStamp } from './lib/backup';
import './theme/tokens.css';
import './ui/ui.css';
import { registerSW } from 'virtual:pwa-register';

// Autoupdate mode reloads the page once a new version has installed; also check whenever the app returns to the foreground.
registerSW({
  immediate: true,
  onRegisteredSW(_url, reg) {
    if (!reg) return;
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') void reg.update();
    });
    setInterval(() => void reg.update(), 60 * 60 * 1000);
  },
});

ensureInstalledStamp();
void navigator.storage?.persist?.(); // ask the browser not to evict our data

seedIfEmpty().then(backfillSnapshots).catch(() => undefined).finally(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </StrictMode>,
  );
});
