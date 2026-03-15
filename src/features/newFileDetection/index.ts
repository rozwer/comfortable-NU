/**
 * 新着ファイル検知機能
 * Content API の modifiedTime / createdTime を前回取得分と比較し、新着を検出する。
 * バッジ表示は favoritesBar.ts に委譲し、本モジュールはストレージ管理と API 呼び出しを担う。
 *
 * ストレージ構造:
 *   chrome.storage.local[hostname]["fileCheckedTimestamps"]: { [courseId]: number }
 *   chrome.storage.local[hostname]["newFileFlags"]:          { [courseId]: boolean }
 */

import { fromStorage, toStorage } from "../storage";
import { createLogger } from "../../utils/logger";

const logger = createLogger("newFileDetection");

const BASE_URL = "https://tact.ac.thers.ac.jp";

/** Content API レスポンス内の個別アイテム */
interface ContentItem {
    id?: string;
    title?: string;
    type?: string;
    modifiedTime?: number;
    createdTime?: number;
}

/** Content API レスポンス全体 */
interface ContentApiResponse {
    content_collection?: ContentItem[];
}

/** ストレージキー */
export const FileCheckedTimestampsStorage = "fileCheckedTimestamps";
export const NewFileFlagsStorage = "newFileFlags";

/** コース別最終チェック時刻の型 */
export type FileCheckedTimestamps = { [courseId: string]: number };

/** コース別新着フラグの型 */
export type NewFileFlags = { [courseId: string]: boolean };

/**
 * 指定コースの Content API を呼び出し、アイテム一覧を返す。
 * 認証エラー (401/403) やネットワークエラーの場合は null を返す。
 */
async function fetchContentItems(siteId: string): Promise<ContentItem[] | null> {
    try {
        const response = await fetch(`${BASE_URL}/direct/content/site/${siteId}.json`, {
            method: "GET",
            credentials: "include",
            headers: {
                Accept: "application/json",
            },
        });

        if (!response.ok) {
            logger.warn(`Content API error for site ${siteId}: HTTP ${response.status}`);
            return null;
        }

        const data: ContentApiResponse = await response.json();
        return data.content_collection ?? [];
    } catch (error) {
        logger.error(`Failed to fetch content for site ${siteId}:`, error);
        return null;
    }
}

/**
 * アイテムリストの中から最新の更新時刻（modifiedTime と createdTime の最大値）を返す。
 * アイテムが空の場合は 0 を返す。
 */
function getLatestTimestamp(items: ContentItem[]): number {
    let latest = 0;
    for (const item of items) {
        if (typeof item.modifiedTime === "number" && item.modifiedTime > latest) {
            latest = item.modifiedTime;
        }
        if (typeof item.createdTime === "number" && item.createdTime > latest) {
            latest = item.createdTime;
        }
    }
    return latest;
}

/**
 * 指定コースに新着ファイルがあるかを判定する。
 * lastChecked より後に modifiedTime or createdTime が更新されたアイテムが存在する場合 true。
 * lastChecked が 0（初回チェック）の場合は新着とみなさない。
 */
function hasNewFiles(items: ContentItem[], lastChecked: number): boolean {
    if (lastChecked === 0) {
        // 初回チェックはすべてのファイルが「既読」扱い
        return false;
    }
    for (const item of items) {
        const modified = item.modifiedTime ?? 0;
        const created = item.createdTime ?? 0;
        const newest = Math.max(modified, created);
        if (newest > lastChecked) {
            return true;
        }
    }
    return false;
}

/**
 * 複数コースのファイルをチェックし、新着フラグとチェック時刻をストレージに保存する。
 *
 * @param hostname  ストレージのプライマリキー（window.location.hostname）
 * @param courseIds チェック対象のコース ID 配列
 */
export async function checkNewFiles(hostname: string, courseIds: string[]): Promise<void> {
    if (courseIds.length === 0) return;

    // 現在のストレージ値を読み込む
    const checkedTimestamps = await fromStorage<FileCheckedTimestamps>(hostname, FileCheckedTimestampsStorage, (data) =>
        data && typeof data === "object" ? data : {}
    );
    const newFileFlags = await fromStorage<NewFileFlags>(hostname, NewFileFlagsStorage, (data) =>
        data && typeof data === "object" ? data : {}
    );

    // 全コースを並列で取得
    const results = await Promise.allSettled(
        courseIds.map(async (courseId) => {
            const items = await fetchContentItems(courseId);
            return { courseId, items };
        })
    );

    const now = Math.floor(Date.now() / 1000);

    for (const result of results) {
        if (result.status !== "fulfilled") continue;
        const { courseId, items } = result.value;
        if (items === null) continue; // API 呼び出し失敗はスキップ

        const lastChecked = checkedTimestamps[courseId] ?? 0;
        const isNew = hasNewFiles(items, lastChecked);

        // 新着フラグを更新（新着あり: true、すでに true の場合は上書きしない）
        if (isNew) {
            newFileFlags[courseId] = true;
        } else if (!(courseId in newFileFlags)) {
            // 初回チェック時はフラグを false で初期化
            newFileFlags[courseId] = false;
        }

        // 最終チェック時刻を最新のタイムスタンプで更新
        const latest = getLatestTimestamp(items);
        checkedTimestamps[courseId] = latest > 0 ? latest : now;
    }

    // ストレージに保存
    await toStorage(hostname, FileCheckedTimestampsStorage, checkedTimestamps);
    await toStorage(hostname, NewFileFlagsStorage, newFileFlags);

    logger.debug("checkNewFiles completed", { hostname, checkedCount: courseIds.length });
}

/**
 * 指定コースの新着フラグを読み込んで返す。
 * ストレージアクセス失敗時は空オブジェクトを返す。
 */
export async function getNewFileFlags(hostname: string): Promise<NewFileFlags> {
    return fromStorage<NewFileFlags>(hostname, NewFileFlagsStorage, (data) =>
        data && typeof data === "object" ? data : {}
    );
}

/**
 * 指定コースの新着フラグをクリアする（フォルダ閲覧時など）。
 *
 * @param hostname ストレージのプライマリキー
 * @param courseId クリア対象のコース ID
 */
export async function clearNewFileFlag(hostname: string, courseId: string): Promise<void> {
    const flags = await getNewFileFlags(hostname);
    if (flags[courseId]) {
        flags[courseId] = false;
        await toStorage(hostname, NewFileFlagsStorage, flags);
        logger.debug(`clearNewFileFlag: ${courseId}`);
    }
}
