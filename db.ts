import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db as firestoreDb, auth, handleFirestoreError, OperationType } from './firebase';

const DB_NAME = 'AdventurePlannerDB';
const STORE_NAME = 'gpxFiles';
const DB_VERSION = 1;

let localIndexedDb: IDBDatabase;

// Function to initialize the local IndexedDB cache
export const initDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        if (localIndexedDb) {
            return resolve(localIndexedDb);
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = (event) => {
            console.error("Local database error: ", (event.target as IDBRequest).error);
            reject("Local database error");
        };

        request.onsuccess = (event) => {
            localIndexedDb = (event.target as IDBRequest).result;
            resolve(localIndexedDb);
        };

        request.onupgradeneeded = (event) => {
            const tempDb = (event.target as IDBRequest).result;
            if (!tempDb.objectStoreNames.contains(STORE_NAME)) {
                tempDb.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };
    });
};

// Function to save a GPX file locally in IndexedDB cache
const saveGpxLocal = async (file: { id: string, content: string }): Promise<void> => {
    const ldb = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = ldb.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(file);

        request.onsuccess = () => resolve();
        request.onerror = (event) => {
            console.error('Error saving local GPX:', (event.target as IDBRequest).error);
            reject('Error saving local GPX');
        };
    });
};

// Function to get a GPX file from local IndexedDB cache
const getGpxLocal = async (id: string): Promise<string | undefined> => {
    const ldb = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = ldb.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(id);

        request.onsuccess = () => {
            resolve(request.result?.content);
        };
        request.onerror = (event) => {
            console.error('Error getting local GPX:', (event.target as IDBRequest).error);
            reject('Error getting local GPX');
        };
    });
};

// Function to delete a GPX file local cache
const deleteGpxLocal = async (id: string): Promise<void> => {
    const ldb = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = ldb.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = (event) => {
            console.error('Error deleting local GPX:', (event.target as IDBRequest).error);
            reject('Error deleting local GPX');
        };
    });
};

// Function to save a GPX file (Both Cloud Firestore & Local Cache)
export const saveGpx = async (file: { id: string, content: string }): Promise<void> => {
    // 1. Save to local cache first
    await saveGpxLocal(file);

    // 2. If signed in, sync with Firestore in the cloud
    if (auth.currentUser) {
        const path = `gpx/${file.id}`;
        try {
            await setDoc(doc(firestoreDb, 'gpx', file.id), {
                id: file.id,
                content: file.content,
                updatedAt: new Date().toISOString()
            });
        } catch (error) {
            handleFirestoreError(error, OperationType.WRITE, path);
        }
    }
};

// Function to get a GPX file content (Cloud first, slide back to local IndexedDB)
export const getGpx = async (id: string): Promise<string | undefined> => {
    // 1. Try to fetch from Firestore first
    const path = `gpx/${id}`;
    try {
        const docRef = doc(firestoreDb, 'gpx', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            // Cache locally for faster access next time
            if (data.content) {
                await saveGpxLocal({ id, content: data.content });
                return data.content;
            }
        }
    } catch (error) {
        console.warn("Could not fetch GPX from cloud, falling back to local storage:", error);
    }

    // 2. Fallback to local cache
    return getGpxLocal(id);
};

// Function to delete a GPX file (Both cloud and local cache)
export const deleteGpx = async (id: string): Promise<void> => {
    await deleteGpxLocal(id);

    if (auth.currentUser) {
        const path = `gpx/${id}`;
        try {
            await deleteDoc(doc(firestoreDb, 'gpx', id));
        } catch (error) {
            handleFirestoreError(error, OperationType.DELETE, path);
        }
    }
};
