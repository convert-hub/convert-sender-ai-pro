const DB_NAME = 'dispatch_storage';
const STORE_NAME = 'parsed_data';
const DB_VERSION = 1;

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    
    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };
    
    request.onerror = () => {
      reject(request.error);
    };
  });
};

export const saveToIndexedDB = async (key: string, data: unknown): Promise<boolean> => {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(data, key);
      
      // CRITICAL: Only resolve when transaction is COMPLETE (data actually persisted)
      tx.oncomplete = () => {
        console.log(`[IndexedDB] Saved ${key} - transaction complete`);
        db.close();
        resolve(true);
      };
      
      tx.onerror = () => {
        console.error(`[IndexedDB] Transaction error for ${key}:`, tx.error);
        db.close();
        resolve(false);
      };
      
      tx.onabort = () => {
        console.error(`[IndexedDB] Transaction aborted for ${key}`);
        db.close();
        resolve(false);
      };
    });
  } catch (error) {
    console.error('[IndexedDB] Error opening database:', error);
    return false;
  }
};

export const getFromIndexedDB = async <T>(key: string): Promise<T | null> => {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(key);
      
      request.onsuccess = () => {
        const result = request.result as T | undefined;
        console.log(`[IndexedDB] Retrieved ${key}:`, !!result);
        resolve(result ?? null);
      };
      
      request.onerror = () => {
        console.error(`[IndexedDB] Error retrieving ${key}:`, request.error);
        resolve(null);
      };
      
      tx.oncomplete = () => db.close();
    });
  } catch (error) {
    console.error('[IndexedDB] Error opening database:', error);
    return null;
  }
};

export const clearFromIndexedDB = async (key: string): Promise<void> => {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(key);
      
      request.onsuccess = () => {
        console.log(`[IndexedDB] Cleared ${key}`);
        resolve();
      };
      
      request.onerror = () => {
        console.error(`[IndexedDB] Error clearing ${key}:`, request.error);
        resolve();
      };
      
      tx.oncomplete = () => db.close();
    });
  } catch (error) {
    console.error('[IndexedDB] Error opening database:', error);
  }
};

export const clearAllFromIndexedDB = async (): Promise<void> => {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.clear();
      
      request.onsuccess = () => {
        console.log('[IndexedDB] Cleared all data');
        resolve();
      };
      
      request.onerror = () => {
        console.error('[IndexedDB] Error clearing all:', request.error);
        resolve();
      };
      
      tx.oncomplete = () => db.close();
    });
  } catch (error) {
    console.error('[IndexedDB] Error opening database:', error);
  }
};
