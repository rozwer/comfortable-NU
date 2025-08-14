/**
 * -----------------------------------------------------------------
 * Modified by: roz
 * Date       : 2025-08-14
 * Changes    : Bullhorn通知の取得（返却通知のフィルタと整形）を追加
 * Category   : 通知・データ取得
 * -----------------------------------------------------------------
 */
import { getBaseURL } from "../api/fetch";

export type BullhornAlert = {
    id: number;
    event: string;
    eventDate?: { epochSecond: number; nano?: number };
    formattedEventDate?: string;
    fromDisplayName?: string;
    fromUser?: string;
    ref?: string;
    siteId?: string;
    siteTitle?: string;
    title?: string;
    toUser?: string;
    url?: string;
};

export type ReturnAlert = BullhornAlert & {
    assignmentId?: string; // URLのクエリから抽出
};

/**
 * Bullhorn通知一覧を取得
 */
export async function fetchBullhornAlerts(useCache = false): Promise<BullhornAlert[]> {
    const base = getBaseURL();
    const url = `${base}/direct/portal/bullhornAlerts.json`;
    const cacheOption: RequestCache = useCache ? "default" : "no-cache";
    const res = await fetch(url, { cache: cacheOption });
    if (!res.ok) throw new Error(`bullhornAlerts: HTTP ${res.status}`);
    const data = await res.json();
    if (Array.isArray(data)) return data as BullhornAlert[];
    // 一部のSakai実装で { alerts: [] } の形もあるかもしれない
    // @ts-ignore
    if (Array.isArray(data?.alerts)) return data.alerts as BullhornAlert[];
    return [];
}

/**
 * 返却通知（asn.grade.submission）のみ抽出し、assignmentIdをURLから抽出
 */
export function extractReturnAlerts(alerts: BullhornAlert[]): ReturnAlert[] {
    const returns = alerts.filter(a => a.event === "asn.grade.submission");
    return returns.map(a => {
        let assignmentId: string | undefined;
        if (a.url) {
            try {
                const u = new URL(a.url);
                assignmentId = u.searchParams.get("assignmentId") || undefined;
            } catch {
                // ignore
            }
        }
        return { ...a, assignmentId } as ReturnAlert;
    });
}

/**
 * 同一課題に対する複数通知がある場合、最新のみ残す（id or eventDateの降順で1件）
 */
export function dedupeLatestByAssignment(alerts: ReturnAlert[]): ReturnAlert[] {
    const map = new Map<string, ReturnAlert>();
    for (const a of alerts) {
        const key = a.assignmentId || `${a.siteId || ""}|${a.ref || a.title || a.id}`; // fallback
        const prev = map.get(key);
        if (!prev) {
            map.set(key, a);
            continue;
        }
        const prevTs = prev.eventDate?.epochSecond || 0;
        const curTs = a.eventDate?.epochSecond || 0;
        if (a.id > prev.id || curTs > prevTs) map.set(key, a);
    }
    return Array.from(map.values());
}

/**
 * コースIDごとにグルーピング
 */
export function groupBySite(alerts: ReturnAlert[]): Map<string, ReturnAlert[]> {
    const m = new Map<string, ReturnAlert[]>();
    for (const a of alerts) {
        const site = a.siteId || "";
        if (!m.has(site)) m.set(site, []);
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        m.get(site)!.push(a);
    }
    return m;
}

/**
 * 課題詳細（返却詳細含む）を取得
 */
export async function fetchAssignmentItem(assignmentId: string, useCache = false): Promise<any> {
    const base = getBaseURL();
    const url = `${base}/direct/assignment/item/${assignmentId}.json`;
    const cacheOption: RequestCache = useCache ? "default" : "no-cache";
    const res = await fetch(url, { cache: cacheOption });
    if (!res.ok) throw new Error(`assignment.item: HTTP ${res.status}`);
    return await res.json();
}

