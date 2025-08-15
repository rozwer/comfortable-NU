/**
 * -----------------------------------------------------------------
 * Modified by: roz
 * Date       : 2025-08-14
 * Changes    : 返却課題ダッシュボード（未読の成績返却一覧）を追加
 * Category   : UI・通知
 * -----------------------------------------------------------------
 */
import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { dedupeLatestByAssignment, extractReturnAlerts, fetchAssignmentItem, fetchBullhornAlerts, groupBySite, ReturnAlert } from "./features/notification/bullhorn";
import { getBaseURL } from "./features/api/fetch";
import { getCachedAssignmentItem, getCachedBullhorn, setCachedAssignmentItem, setCachedBullhorn } from "./features/notification/cache";

type ItemRow = {
    alert: ReturnAlert;
    assignmentId: string;
    title: string;
    grade: string;
    needResubmit: boolean;
    commentPreview: string;
    courseId: string;
    courseTitle: string;
    detailUrl?: string;
};

function stripHtml(html: string | undefined): string {
    if (!html) return "";
    const div = document.createElement("div");
    div.innerHTML = html;
    return (div.textContent || div.innerText || "").trim();
}

function useReturnedItems() {
    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState<ItemRow[]>([]);
    const [hostname, setHostname] = useState<string>(window.location.hostname);
    const [collapsedCourses, setCollapsedCourses] = useState<Set<string>>(new Set());

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const base = getBaseURL();
                if (!base) setHostname(window.location.hostname);
                // Bullhorn: キャッシュ優先
                const cachedBh = await getCachedBullhorn(hostname);
                let alerts = cachedBh;
                if (!alerts) {
                    alerts = await fetchBullhornAlerts(false);
                    await setCachedBullhorn(hostname, alerts);
                }
                const returns = dedupeLatestByAssignment(extractReturnAlerts(alerts));
                // 既読の概念なし → すべて表示
                const groups = groupBySite(returns);
                const rows: ItemRow[] = [];
                for (const [, list] of groups) {
                    for (const a of list) {
                        if (!a.assignmentId) continue;
                        try {
                            // 課題詳細: 個別キャッシュ優先
                            const cached = await getCachedAssignmentItem(hostname, a.assignmentId);
                            const data = cached || await fetchAssignmentItem(a.assignmentId, false);
                            if (!cached) await setCachedAssignmentItem(hostname, a.assignmentId, data);
                            const title: string = data?.title || a.title || "";
                            const subs: any[] = Array.isArray(data?.submissions) ? data.submissions : [];
                            const latest = subs.sort((x, y) => (y?.dateSubmittedEpochSeconds || 0) - (x?.dateSubmittedEpochSeconds || 0))[0];
                            const grade = (latest?.grade != null && String(latest?.grade).length > 0) ? String(latest.grade) : (latest?.graded === true ? String(latest?.grade) : (data?.grading || latest?.grade) || "");
                            const feedback = stripHtml(latest?.feedbackComment);
                            const allowResubmit = (latest?.properties?.allow_resubmit_number && latest?.properties?.allow_resubmit_number !== "0") || (data?.allowResubmission === true);
                            const resubmitDue = latest?.properties?.allow_resubmit_due_time || latest?.allow_resubmit_due_time || undefined;
                            const needResubmit = !!allowResubmit && (!!resubmitDue ? (Number(resubmitDue) / 1000) > (Date.now() / 1000) : true);
                            rows.push({
                                alert: a,
                                assignmentId: a.assignmentId,
                                title,
                                grade: grade || "",
                                needResubmit,
                                commentPreview: feedback?.slice(0, 140) || "",
                                courseId: a.siteId || "",
                                courseTitle: a.siteTitle || "",
                                detailUrl: a.url
                            });
                        } catch {
                            // 課題詳細取得失敗はスキップ
                        }
                    }
                }
                if (!cancelled) setItems(rows);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [hostname]);

    const toggleCourse = (courseId: string) => {
        setCollapsedCourses(prev => {
            const next = new Set(prev);
            if (next.has(courseId)) next.delete(courseId);
            else next.add(courseId);
            return next;
        });
    };

    return { loading, items, hostname, collapsedCourses, toggleCourse };
}

function ReturnedDashboard() {
    const { loading, items, collapsedCourses, toggleCourse } = useReturnedItems();

    const grouped = useMemo(() => {
        const m = new Map<string, { title: string; items: ItemRow[] }>();
        for (const it of items) {
            const key = it.courseId || "";
            if (!m.has(key)) m.set(key, { title: it.courseTitle || key, items: [] });
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            m.get(key)!.items.push(it);
        }
        return m;
    }, [items]);

    return (
        <div className="cs-tact-modal cs-return-tact-modal">
            <div className="cs-tact-modal-header">
                <h2>返却課題ダッシュボード</h2>
                <button className="cs-tact-modal-close" onClick={hideReturnedDashboard}>×</button>
            </div>
            <div className="cs-tact-modal-content">
                {loading ? (
                    <div className="cs-return-loading">読み込み中...</div>
                ) : (
                    <div className="cs-return-body">
                        {items.length === 0 ? (
                            <p>返却のお知らせは見つかりませんでした。</p>
                        ) : (
                            Array.from(grouped.entries()).map(([courseId, data]) => (
                                <div key={courseId} className={"cs-folder-section" + (collapsedCourses.has(courseId) ? " cs-collapsed" : "") }>
                                    <div className="cs-folder-header" style={{cursor: 'pointer'}} onClick={() => toggleCourse(courseId)}>
                                        <h4>{data.title}</h4>
                                        <span className="cs-collapse-indicator">{collapsedCourses.has(courseId) ? "▶" : "▼"}</span>
                                    </div>
                                    <div className="cs-return-items">
                                        {data.items.map(it => (
                                            <div key={it.alert.id} className="cs-return-item cs-forum-post">
                                                <div className="cs-forum-post-header cs-return-item-main">
                                                    <span className="cs-return-title cs-forum-post-title">{it.title}</span>
                                                    {it.grade ? <span className="cs-return-badge-grade">{it.grade}</span> : null}
                                                    {it.needResubmit ? <span className="cs-return-badge-resubmit">再提出可能</span> : null}
                                                </div>
                                                {it.commentPreview ? (
                                                    <details className="cs-return-details">
                                                        <summary className="cs-return-summary">採点者コメントを表示</summary>
                                                        <div className="cs-return-comment cs-forum-post-content">{it.commentPreview}</div>
                                                    </details>
                                                ) : null}
                                                <div className="cs-return-actions cs-forum-post-actions">
                                                    {it.detailUrl ? (
                                                        /**
                                                         * -----------------------------------------------------------------
                                                         * Modified by: roz
                                                         * Date       : 2025-08-15
                                                         * Changes    : 返却課題の詳細表示で新規タブを開かないように変更（同一タブ遷移）
                                                         * Category   : UI・ナビゲーション
                                                         * -----------------------------------------------------------------
                                                         */
                                                        <a className="cs-return-link" href={it.detailUrl}>詳細へ</a>
                                                    ) : null}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export function showReturnedDashboard(): void {
    const container = document.createElement("div");
    container.id = "cs-return-root";
    document.body.appendChild(container);
    const root = createRoot(container);
    root.render(<ReturnedDashboard />);
}

export function hideReturnedDashboard(): void {
    const c = document.getElementById("cs-return-root");
    if (c && c.parentElement) c.parentElement.removeChild(c);
}
