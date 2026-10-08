/** Asks the browser for the newest app version. Autoupdate mode reloads the page once it has installed. */
export async function checkForUpdate(): Promise<'installing' | 'current' | 'unsupported'> {
  if (!('serviceWorker' in navigator)) return 'unsupported';
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return 'unsupported';
  await reg.update();
  return reg.installing || reg.waiting ? 'installing' : 'current';
}

/** Drops the app's cached files and service worker, then reloads. Entries live in IndexedDB and are untouched. */
export async function reloadFresh(): Promise<void> {
  if ('serviceWorker' in navigator) await (await navigator.serviceWorker.getRegistration())?.unregister();
  if ('caches' in window) await Promise.all((await caches.keys()).map((k) => caches.delete(k)));
  location.reload();
}
