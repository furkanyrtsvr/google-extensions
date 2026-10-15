const DB_NAME = 'DigiKeyBOM_DB';
const STORE_NAME = 'handles';

function getDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        request.onupgradeneeded = (e) => e.target.result.createObjectStore(STORE_NAME);
        request.onsuccess = (e) => resolve(e.target.result);
        request.onerror = (e) => reject(e.target.error);
    });
}

async function saveHandle(handle) {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(handle, 'backupDir');
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

document.getElementById('selectBtn').addEventListener('click', async () => {
    const status = document.getElementById('status');
    try {
        const handle = await window.showDirectoryPicker();
        await saveHandle(handle);
        chrome.storage.local.set({ backupFolderName: handle.name });

        status.className = 'status success';
        status.textContent = 'Selected: ' + handle.name;

        setTimeout(() => window.close(), 1500);
    } catch (err) {
        if (err.name !== 'AbortError') {
            status.className = 'status error';
            status.textContent = 'Error: ' + err.message;
        }
    }
});
