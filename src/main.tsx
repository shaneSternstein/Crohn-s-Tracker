import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { seedIfEmpty } from './db/seed';
import { ensureInstalledStamp } from './lib/backup';
import './theme/tokens.css';
import './ui/ui.css';

ensureInstalledStamp();
void navigator.storage?.persist?.(); // ask the browser not to evict our data

seedIfEmpty().finally(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </StrictMode>,
  );
});
