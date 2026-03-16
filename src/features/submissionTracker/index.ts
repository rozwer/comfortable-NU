/**
 * 提出率トラッカー機能
 * コースごとの課題提出率を集計・表示するモジュール
 */
import { fetchCourse, getBaseURL } from "../api/fetch";
import { decodeAssignmentFromAPI } from "../entity/assignment/decode";
import { AssignmentEntry } from "../entity/assignment/types";

/** コースごとの提出集計結果 */
export interface CourseSubmissionSummary {
    courseId: string;
    courseName: string;
    total: number;
    submitted: number;
    unsubmitted: number;
    unsubmittedEntries: AssignmentEntry[];
}

/** 全体の提出集計結果 */
export interface OverallSummary {
    total: number;
    submitted: number;
    unsubmitted: number;
    rate: number; // 0-100
}

/**
 * 全コースの課題提出状況を取得する
 */
const CACHE_KEY = "cs-submission-tracker-cache";
const CACHE_TIME_KEY = "cs-submission-tracker-cache-time";
const CACHE_EXPIRE_SECONDS = 2 * 60 * 60; // 2時間

async function fetchAllSubmissionData(forceRefresh = false): Promise<CourseSubmissionSummary[]> {
    // キャッシュチェック
    if (!forceRefresh) {
        const cached = localStorage.getItem(CACHE_KEY);
        const cachedTime = localStorage.getItem(CACHE_TIME_KEY);
        if (cached && cachedTime) {
            const elapsed = (Date.now() - parseInt(cachedTime, 10)) / 1000;
            if (elapsed < CACHE_EXPIRE_SECONDS) {
                return JSON.parse(cached);
            }
        }
    }

    const courses = fetchCourse();
    const baseURL = getBaseURL();

    if (!baseURL || courses.length === 0) {
        return [];
    }

    const pending = courses.map(async (course) => {
        const url = `${baseURL}/direct/assignment/site/${course.id}.json`;
        try {
            const resp = await fetch(url);
            if (!resp.ok) {
                return null;
            }
            const data = await resp.json();
            const entries = decodeAssignmentFromAPI(data);

            const submitted = entries.filter((e) => e.submitted === true).length;
            const unsubmittedEntries = entries.filter((e) => e.submitted !== true);

            const summary: CourseSubmissionSummary = {
                courseId: course.id,
                courseName: course.name ?? course.id,
                total: entries.length,
                submitted,
                unsubmitted: unsubmittedEntries.length,
                unsubmittedEntries,
            };
            return summary;
        } catch {
            return null;
        }
    });

    const results = await Promise.allSettled(pending);
    const summaries: CourseSubmissionSummary[] = [];
    for (const r of results) {
        if (r.status === "fulfilled" && r.value !== null) {
            summaries.push(r.value);
        }
    }

    // キャッシュに保存
    localStorage.setItem(CACHE_KEY, JSON.stringify(summaries));
    localStorage.setItem(CACHE_TIME_KEY, Date.now().toString());

    return summaries;
}

/**
 * 全体の集計を計算する
 */
function calcOverallSummary(courses: CourseSubmissionSummary[]): OverallSummary {
    let total = 0;
    let submitted = 0;
    for (const c of courses) {
        total += c.total;
        submitted += c.submitted;
    }
    const unsubmitted = total - submitted;
    const rate = total === 0 ? 100 : Math.round((submitted / total) * 100);
    return { total, submitted, unsubmitted, rate };
}

/**
 * 横棒グラフ要素を生成する
 */
function createBarGraph(submitted: number, total: number): HTMLElement {
    const wrapper = document.createElement("div");
    wrapper.className = "cs-st-bar-wrapper";

    if (total === 0) {
        const empty = document.createElement("div");
        empty.className = "cs-st-bar-empty";
        empty.textContent = "課題なし";
        wrapper.appendChild(empty);
        return wrapper;
    }

    const submittedPct = Math.round((submitted / total) * 100);
    const unsubmittedPct = 100 - submittedPct;

    const bar = document.createElement("div");
    bar.className = "cs-st-bar";

    if (submittedPct > 0) {
        const submittedFill = document.createElement("div");
        submittedFill.className = "cs-st-bar-submitted";
        submittedFill.style.width = `${submittedPct}%`;
        submittedFill.title = `提出済み: ${submitted}件 (${submittedPct}%)`;
        bar.appendChild(submittedFill);
    }

    if (unsubmittedPct > 0) {
        const unsubmittedFill = document.createElement("div");
        unsubmittedFill.className = "cs-st-bar-unsubmitted";
        unsubmittedFill.style.width = `${unsubmittedPct}%`;
        unsubmittedFill.title = `未提出: ${total - submitted}件 (${unsubmittedPct}%)`;
        bar.appendChild(unsubmittedFill);
    }

    wrapper.appendChild(bar);
    return wrapper;
}

/**
 * 日付フォーマット（unixタイムスタンプ → 人間が読める形式）
 */
function formatDueDate(epochSec: number | null | undefined): string {
    if (!epochSec) return "-";
    const d = new Date(epochSec * 1000);
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const hour = d.getHours().toString().padStart(2, "0");
    const min = d.getMinutes().toString().padStart(2, "0");
    return `${month}/${day} ${hour}:${min}`;
}

/**
 * コース行要素（折りたたみ可能）を生成する
 */
function createCourseRow(summary: CourseSubmissionSummary): HTMLElement {
    const row = document.createElement("div");
    row.className = "cs-st-course-row";

    // ヘッダー行（クリックで展開）
    const header = document.createElement("div");
    header.className = "cs-st-course-header";
    header.setAttribute("role", "button");
    header.setAttribute("tabindex", "0");

    const nameEl = document.createElement("span");
    nameEl.className = "cs-st-course-name";
    nameEl.textContent = summary.courseName;

    const statsEl = document.createElement("span");
    statsEl.className = "cs-st-course-stats";
    const rateVal =
        summary.total === 0
            ? "-"
            : `${Math.round((summary.submitted / summary.total) * 100)}%`;
    statsEl.textContent = `${summary.submitted}/${summary.total} (${rateVal})`;

    const toggleIcon = document.createElement("span");
    toggleIcon.className = "cs-st-toggle-icon";
    toggleIcon.textContent = summary.unsubmitted > 0 ? "▼" : "";

    header.appendChild(nameEl);
    header.appendChild(statsEl);
    header.appendChild(toggleIcon);

    // グラフ
    const graph = createBarGraph(summary.submitted, summary.total);

    // 未提出課題リスト（初期非表示）
    const detail = document.createElement("div");
    detail.className = "cs-st-course-detail cs-st-hidden";

    if (summary.unsubmitted === 0) {
        const allDone = document.createElement("p");
        allDone.className = "cs-st-all-done";
        allDone.textContent = "未提出課題はありません";
        detail.appendChild(allDone);
    } else {
        const list = document.createElement("ul");
        list.className = "cs-st-unsubmitted-list";
        for (const entry of summary.unsubmittedEntries) {
            const li = document.createElement("li");
            li.className = "cs-st-unsubmitted-item";
            const titleSpan = document.createElement("span");
            titleSpan.className = "cs-st-entry-title";
            titleSpan.textContent = entry.title;
            const dueSpan = document.createElement("span");
            dueSpan.className = "cs-st-entry-due";
            dueSpan.textContent = `締切: ${formatDueDate(entry.dueTime)}`;
            li.appendChild(titleSpan);
            li.appendChild(dueSpan);
            list.appendChild(li);
        }
        detail.appendChild(list);
    }

    // 展開トグル
    let expanded = false;
    const toggleDetail = () => {
        if (summary.total === 0) return;
        expanded = !expanded;
        if (expanded) {
            detail.classList.remove("cs-st-hidden");
            toggleIcon.textContent = "▲";
            header.classList.add("cs-st-course-header--open");
        } else {
            detail.classList.add("cs-st-hidden");
            toggleIcon.textContent = summary.unsubmitted > 0 ? "▼" : "";
            header.classList.remove("cs-st-course-header--open");
        }
    };

    header.addEventListener("click", toggleDetail);
    header.addEventListener("keydown", (e: KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggleDetail();
        }
    });

    row.appendChild(header);
    row.appendChild(graph);
    row.appendChild(detail);

    return row;
}

/**
 * 提出率モーダルのコンテンツを構築する
 */
function buildModalContent(
    overall: OverallSummary,
    courses: CourseSubmissionSummary[]
): HTMLElement {
    const content = document.createElement("div");
    content.className = "cs-st-content";

    // サマリーセクション
    const summarySection = document.createElement("div");
    summarySection.className = "cs-st-summary-section";

    const rateDisplay = document.createElement("div");
    rateDisplay.className = "cs-st-overall-rate";
    rateDisplay.textContent = `${overall.rate}%`;

    const statsRow = document.createElement("div");
    statsRow.className = "cs-st-summary-stats";

    const statItems: Array<{ label: string; value: number; cls: string }> = [
        { label: "提出済み", value: overall.submitted, cls: "cs-st-stat-submitted" },
        { label: "未提出", value: overall.unsubmitted, cls: "cs-st-stat-unsubmitted" },
        { label: "合計", value: overall.total, cls: "cs-st-stat-total" },
    ];

    for (const item of statItems) {
        const stat = document.createElement("div");
        stat.className = `cs-st-stat ${item.cls}`;
        const num = document.createElement("span");
        num.className = "cs-st-stat-num";
        num.textContent = String(item.value);
        const label = document.createElement("span");
        label.className = "cs-st-stat-label";
        label.textContent = item.label;
        stat.appendChild(num);
        stat.appendChild(label);
        statsRow.appendChild(stat);
    }

    summarySection.appendChild(rateDisplay);
    summarySection.appendChild(statsRow);

    // 全体グラフ
    const overallGraph = createBarGraph(overall.submitted, overall.total);
    overallGraph.classList.add("cs-st-overall-bar");
    summarySection.appendChild(overallGraph);

    content.appendChild(summarySection);

    // コース別セクション
    if (courses.length === 0) {
        const empty = document.createElement("p");
        empty.className = "cs-st-empty";
        empty.textContent = "コースが見つかりませんでした。";
        content.appendChild(empty);
        return content;
    }

    const coursesSection = document.createElement("div");
    coursesSection.className = "cs-st-courses-section";

    const coursesTitle = document.createElement("h3");
    coursesTitle.className = "cs-st-courses-title";
    coursesTitle.textContent = "コース別提出率";
    coursesSection.appendChild(coursesTitle);

    // 提出率の低い順にソート
    const sorted = [...courses].sort((a, b) => {
        const rateA = a.total === 0 ? 101 : (a.submitted / a.total) * 100;
        const rateB = b.total === 0 ? 101 : (b.submitted / b.total) * 100;
        return rateA - rateB;
    });

    for (const summary of sorted) {
        coursesSection.appendChild(createCourseRow(summary));
    }

    content.appendChild(coursesSection);
    return content;
}

/**
 * 提出率モーダルを表示する
 */
export const showSubmissionTrackerModal = (): void => {
    // 既存のオーバーレイがあれば削除（トグル動作）
    const existingOverlay = document.querySelector(".cs-tact-overlay .cs-st-modal");
    if (existingOverlay) {
        existingOverlay.closest(".cs-tact-overlay")?.remove();
        return;
    }

    // オーバーレイを作成（ビューポート全体をカバーし、モーダルを中央配置）
    const overlay = document.createElement("div");
    overlay.className = "cs-tact-overlay";
    overlay.addEventListener("click", (e) => {
        if (e.target === overlay) overlay.remove();
    });

    // モーダルコンテナ
    const modal = document.createElement("div");
    modal.className = "cs-tact-modal cs-st-modal";

    // ヘッダー
    const header = document.createElement("div");
    header.className = "cs-tact-modal-header";

    const title = document.createElement("h2");
    title.textContent = "提出率";
    header.appendChild(title);

    const closeBtn = document.createElement("button");
    closeBtn.textContent = "×";
    closeBtn.className = "cs-tact-modal-close";
    closeBtn.addEventListener("click", () => overlay.remove());
    header.appendChild(closeBtn);

    modal.appendChild(header);

    // コンテンツエリア（ローディング中）
    const contentArea = document.createElement("div");
    contentArea.className = "cs-tact-modal-content cs-st-modal-content";

    const loading = document.createElement("div");
    loading.className = "cs-st-loading";
    loading.textContent = "データを取得中...";
    contentArea.appendChild(loading);

    modal.appendChild(contentArea);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // 非同期でデータ取得
    fetchAllSubmissionData()
        .then((courses) => {
            const overall = calcOverallSummary(courses);
            const builtContent = buildModalContent(overall, courses);
            contentArea.removeChild(loading);
            contentArea.appendChild(builtContent);
        })
        .catch(() => {
            loading.textContent = "データの取得に失敗しました。";
        });
};
