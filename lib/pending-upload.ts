export type PendingUpload = { key: string; video: Blob; landmarks: Blob; pathnameBase: string; sessionId: string; phoneToken: string; view: string };
const DB_NAME = 'multiview-bsl-uploads';
const STORE = 'pending';

function openDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: 'key' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function savePendingUpload(value: PendingUpload) { const db = await openDb(); await new Promise<void>((resolve, reject) => { const request = db.transaction(STORE, 'readwrite').objectStore(STORE).put(value); request.onsuccess = () => resolve(); request.onerror = () => reject(request.error); }); db.close(); }
export async function getPendingUpload(key: string) { const db = await openDb(); const value = await new Promise<PendingUpload | undefined>((resolve, reject) => { const request = db.transaction(STORE).objectStore(STORE).get(key); request.onsuccess = () => resolve(request.result as PendingUpload | undefined); request.onerror = () => reject(request.error); }); db.close(); return value; }
export async function removePendingUpload(key: string) { const db = await openDb(); await new Promise<void>((resolve, reject) => { const request = db.transaction(STORE, 'readwrite').objectStore(STORE).delete(key); request.onsuccess = () => resolve(); request.onerror = () => reject(request.error); }); db.close(); }
