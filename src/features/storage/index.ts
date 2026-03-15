import { HostnameStorage } from "../../constant";

/**
 * chrome.runtime.lastError をチェックし、エラーがあれば reject する共通ヘルパー
 */
function checkRuntimeError(): Error | null {
    if (chrome.runtime.lastError) {
        return new Error(chrome.runtime.lastError.message || 'Unknown chrome.storage error');
    }
    return null;
}

/**
 * toStorage の read-modify-write race condition を防ぐ直列化キュー。
 * 同一 hostname に対する書き込みを順番に処理する。
 */
const writeQueues = new Map<string, Promise<string>>();

/**
 * Load data from Storage.
 * Type T is generics for return type.
 * @param hostname - A PRIMARY key for storage. Usually a hostname of Sakai LMS.
 * @param key - - A SECONDARY key for storage. Defined in `constant.ts`.
 * @param decoder - Decoder for generics type T.
 */
export const fromStorage = <T>(hostname: string, key: string, decoder: (data: any) => T): Promise<T> => {
    return new Promise(function (resolve, reject) {
        chrome.storage.local.get(hostname, function (items: any) {
            const err = checkRuntimeError();
            if (err) { reject(err); return; }
            if (hostname in items && key in items[hostname]) {
                resolve(decoder(items[hostname][key]));
            } else {
                resolve(decoder(undefined));
            }
        });
    });
};

/**
 * Get hostname from Storage.
 * Hostname is a primary key for storage. Usually a hostname of Sakai LMS.
 * @returns {Promise<string | undefined>}
 */
export const loadHostName = (): Promise<string | undefined> => {
    return new Promise(function (resolve, reject) {
        chrome.storage.local.get(HostnameStorage, function (items: any) {
            const err = checkRuntimeError();
            if (err) { reject(err); return; }
            if (typeof items[HostnameStorage] === "undefined") {
                resolve(undefined);
            } else resolve(items[HostnameStorage]);
        });
    });
};

/**
 * Save data to Storage.
 * 直列化キューを使い、同一 hostname への並行書き込みによるデータ消失を防ぐ。
 * @param hostname - A PRIMARY key for storage. Usually a hostname of Sakai LMS.
 * @param key - A SECONDARY key for storage. Defined in `constant.ts`.
 * @param value - A data to be stored.
 */
export const toStorage = (hostname: string, key: string, value: any): Promise<string> => {
    const prevQueue = writeQueues.get(hostname) || Promise.resolve("" as string);
    const nextQueue = prevQueue.then(() => doWrite(hostname, key, value), () => doWrite(hostname, key, value));
    writeQueues.set(hostname, nextQueue);
    return nextQueue;
};

function doWrite(hostname: string, key: string, value: any): Promise<string> {
    return new Promise(function (resolve, reject) {
        chrome.storage.local.get(hostname, function (items: any) {
            const getErr = checkRuntimeError();
            if (getErr) { reject(getErr); return; }
            if (typeof items[hostname] === "undefined") {
                items[hostname] = {};
            }
            items[hostname][key] = value;
            chrome.storage.local.set({ [hostname]: items[hostname] }, () => {
                const setErr = checkRuntimeError();
                if (setErr) { reject(setErr); return; }
                resolve("saved");
            });
        });
    });
}

/**
 * Saves hostname to Storage.
 * @param hostname - A PRIMARY key for storage. Usually a hostname of Sakai LMS.
 */
export const saveHostName = (hostname: string): Promise<string> => {
    return new Promise(function (resolve, reject) {
        chrome.storage.local.set({ [HostnameStorage]: hostname }, () => {
            const err = checkRuntimeError();
            if (err) { reject(err); return; }
            resolve("saved");
        });
    });
};
