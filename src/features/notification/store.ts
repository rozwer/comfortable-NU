/**
 * -----------------------------------------------------------------
 * Modified by: roz
 * Date       : 2025-08-14
 * Changes    : 返却通知の既読管理ストレージを追加（通知ID単位）
 * Category   : 通知・ストレージ
 * -----------------------------------------------------------------
 */

const STORAGE_KEY_PREFIX = "returnAlerts.read."; // + hostname

export type ReadMap = { [id: string]: number }; // id -> read timestamp

function key(hostname: string): string {
    return STORAGE_KEY_PREFIX + hostname;
}

export async function getReadMap(hostname: string): Promise<ReadMap> {
    return new Promise((resolve) => {
        try {
            chrome.storage.local.get([key(hostname)], (r) => {
                const m = (r?.[key(hostname)] as ReadMap) || {};
                resolve(m);
            });
        } catch {
            resolve({});
        }
    });
}

export async function setReadMap(hostname: string, map: ReadMap): Promise<void> {
    return new Promise((resolve) => {
        try {
            chrome.storage.local.set({ [key(hostname)]: map }, () => resolve());
        } catch {
            resolve();
        }
    });
}

export async function markRead(hostname: string, id: number): Promise<void> {
    const m = await getReadMap(hostname);
    m[String(id)] = Date.now();
    await setReadMap(hostname, m);
}

export async function markReadBulk(hostname: string, ids: number[]): Promise<void> {
    const m = await getReadMap(hostname);
    const ts = Date.now();
    for (const id of ids) m[String(id)] = ts;
    await setReadMap(hostname, m);
}

export function isUnread(readMap: ReadMap, id: number): boolean {
    return !(String(id) in readMap);
}

