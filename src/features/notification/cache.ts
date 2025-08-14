/**
 * -----------------------------------------------------------------
 * Modified by: roz
 * Date       : 2025-08-14
 * Changes    : Bullhorn通知と課題詳細の簡易キャッシュ（chrome.storage.local）を実装
 * Category   : 通知・キャッシュ
 * -----------------------------------------------------------------
 */

import { BullhornAlert } from "./bullhorn";

type CacheEntry<T> = { ts: number; value: T };

const BH_KEY = (host: string) => `returnAlerts.cache.${host}`;
const AI_KEY = (host: string, id: string) => `returnAlerts.assignmentItem.${host}.${id}`;

// TTLs (ms)
export const BULLHORN_TTL_MS = 5 * 60 * 1000; // 5分
export const ASSIGNMENT_ITEM_TTL_MS = 30 * 60 * 1000; // 30分

async function getLocal<T>(key: string): Promise<CacheEntry<T> | null> {
    return new Promise((resolve) => {
        try {
            chrome.storage.local.get([key], (r) => {
                const v = r?.[key] as CacheEntry<T> | undefined;
                resolve(v || null);
            });
        } catch {
            resolve(null);
        }
    });
}

async function setLocal<T>(key: string, value: T): Promise<void> {
    return new Promise((resolve) => {
        try {
            const entry: CacheEntry<T> = { ts: Date.now(), value };
            chrome.storage.local.set({ [key]: entry }, () => resolve());
        } catch {
            resolve();
        }
    });
}

export async function getCachedBullhorn(host: string): Promise<BullhornAlert[] | null> {
    const e = await getLocal<BullhornAlert[]>(BH_KEY(host));
    if (!e) return null;
    if (Date.now() - e.ts > BULLHORN_TTL_MS) return null;
    return e.value || null;
}

export async function setCachedBullhorn(host: string, alerts: BullhornAlert[]): Promise<void> {
    await setLocal(BH_KEY(host), alerts);
}

export async function getCachedAssignmentItem<T = any>(host: string, id: string): Promise<T | null> {
    const e = await getLocal<T>(AI_KEY(host, id));
    if (!e) return null;
    if (Date.now() - e.ts > ASSIGNMENT_ITEM_TTL_MS) return null;
    return e.value || null;
}

export async function setCachedAssignmentItem<T = any>(host: string, id: string, data: T): Promise<void> {
    await setLocal(AI_KEY(host, id), data);
}

