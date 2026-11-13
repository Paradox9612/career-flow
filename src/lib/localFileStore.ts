const DB_NAME = 'careerflow_local_files';
const DB_VERSION = 1;
const STORE_NAME = 'files';

export const MAX_LOCAL_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

export const ALLOWED_DOCUMENT_EXTENSIONS = [
  '.pdf',
  '.doc',
  '.docx',
  '.txt',
  '.md',
  '.png',
  '.jpg',
  '.jpeg',
] as const;

export const ALLOWED_DOCUMENT_ACCEPT = ALLOWED_DOCUMENT_EXTENSIONS.join(',');

export interface StoredLocalFile {
  key: string;
  blob: Blob;
  fileName: string;
  fileType: string;
  fileSize: number;
  savedAt: string;
}

function isIndexedDbSupported(): boolean {
  return typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';
}

function openFileDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!isIndexedDbSupported()) {
      reject(new Error('IndexedDB is not supported in this browser environment.'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error('Unable to open local document storage.'));
  });
}

export function validateSelectedFile(file: File): string | null {
  const lower = file.name.toLowerCase();
  const hasAllowedExtension = ALLOWED_DOCUMENT_EXTENSIONS.some((ext) => lower.endsWith(ext));
  if (!hasAllowedExtension) {
    return `Unsupported file type. Allowed formats: ${ALLOWED_DOCUMENT_EXTENSIONS.join(', ')}`;
  }
  if (file.size > MAX_LOCAL_FILE_BYTES) {
    return `File exceeds the 10 MB browser storage limit (${formatFileSize(file.size)} selected).`;
  }
  return null;
}

export async function extractTextFromFile(file: File): Promise<string | null> {
  const lower = file.name.toLowerCase();
  if (lower.endsWith('.txt') || lower.endsWith('.md') || file.type.startsWith('text/')) {
    try {
      const text = await file.text();
      return text.trim().slice(0, 30000);
    } catch {
      return null;
    }
  }
  return null;
}

export async function saveLocalFile(key: string, file: File): Promise<void> {
  const db = await openFileDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const record: StoredLocalFile = {
      key,
      blob: file,
      fileName: file.name,
      fileType: file.type || 'application/octet-stream',
      fileSize: file.size,
      savedAt: new Date().toISOString(),
    };
    const req = store.put(record);
    req.onerror = () => reject(req.error ?? new Error('Failed to store file locally.'));
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error ?? new Error('IndexedDB transaction failed while saving file.'));
    };
  });
}

export async function getLocalFile(key: string): Promise<StoredLocalFile | null> {
  if (!key || !isIndexedDbSupported()) return null;
  try {
    const db = await openFileDatabase();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => {
        resolve((req.result as StoredLocalFile | undefined) ?? null);
      };
      req.onerror = () => reject(req.error ?? new Error('Failed to read local file.'));
      tx.oncomplete = () => db.close();
    });
  } catch {
    return null;
  }
}

export async function hasLocalFile(key?: string): Promise<boolean> {
  if (!key) return false;
  const record = await getLocalFile(key);
  return record !== null;
}

export async function getLocalFileAvailability(
  keys: string[]
): Promise<Record<string, boolean>> {
  const result: Record<string, boolean> = {};
  const unique = Array.from(new Set(keys.filter(Boolean)));
  if (unique.length === 0 || !isIndexedDbSupported()) return result;

  try {
    const db = await openFileDatabase();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      let completed = 0;

      unique.forEach((key) => {
        const req = store.count(key);
        req.onsuccess = () => {
          result[key] = (req.result ?? 0) > 0;
          completed += 1;
          if (completed === unique.length) resolve();
        };
        req.onerror = () => {
          result[key] = false;
          completed += 1;
          if (completed === unique.length) resolve();
        };
      });

      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        resolve();
      };
    });
  } catch {
    // Return empty availability map if IndexedDB cannot be opened
  }

  return result;
}

export async function deleteLocalFile(key?: string): Promise<void> {
  if (!key || !isIndexedDbSupported()) return;
  try {
    const db = await openFileDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(key);
      req.onerror = () => reject(req.error ?? new Error('Failed to delete local file.'));
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
    });
  } catch {
    // Non-fatal cleanup
  }
}

export async function clearAllLocalFiles(): Promise<void> {
  if (!isIndexedDbSupported()) return;
  try {
    const db = await openFileDatabase();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.clear();
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        resolve();
      };
    });
  } catch {
    // Non-fatal cleanup
  }
}

export function triggerBlobDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName || 'document';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
