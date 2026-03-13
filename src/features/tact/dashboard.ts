/**
 * ダッシュボード機能
 * 全コース横断の課題一覧、お知らせタイムライン、学習負荷可視化、提出率トラッカー、添付ファイル一括DL
 */
import { fetchCourse, getBaseURL, fetchAssignment, fetchQuiz } from '../api/fetch';
import { Course } from '../course/types';

// ========== 型定義 ==========

interface DashboardAssignment {
    id: string;
    title: string;
    courseName: string;
    courseId: string;
    dueTime: number;       // unix seconds
    openTime?: number;
    closeTime?: number;
    submitted: boolean;
    attachments?: Array<{ url: string; name: string; size?: string }>;
}

interface DashboardQuiz {
    id: string;
    title: string;
    courseName: string;
    courseId: string;
    dueTime: number;
}

interface DashboardAnnouncement {
    announcementId: string;
    title: string;
    body: string;
    courseName: string;
    courseId: string;
    createdOn: number;
    createdByDisplayName?: string;
    attachments?: Array<{ url: string; name: string }>;
}

// ========== ダッシュボードUI ==========

export class DashboardUI {
    private container: HTMLElement;
    private assignments: DashboardAssignment[] = [];
    private quizzes: DashboardQuiz[] = [];
    private announcements: DashboardAnnouncement[] = [];
    private courses: Course[] = [];
    private activeView: 'weekly' | 'timeline' | 'workload' | 'submission' = 'weekly';

    constructor(container: HTMLElement) {
        this.container = container;
        this.courses = fetchCourse();
        this.init();
    }

    private async init() {
        this.render();
        this.addViewSwitchListeners();
        await this.loadAllData();
    }

    private render() {
        this.container.innerHTML = `
            <div class="dashboard-ui">
                <div class="dashboard-nav">
                    <button class="dashboard-nav-btn ${this.activeView === 'weekly' ? 'active' : ''}" data-view="weekly">
                        📅 週次ダッシュボード
                    </button>
                    <button class="dashboard-nav-btn ${this.activeView === 'timeline' ? 'active' : ''}" data-view="timeline">
                        📢 お知らせタイムライン
                    </button>
                    <button class="dashboard-nav-btn ${this.activeView === 'workload' ? 'active' : ''}" data-view="workload">
                        📊 学習負荷
                    </button>
                    <button class="dashboard-nav-btn ${this.activeView === 'submission' ? 'active' : ''}" data-view="submission">
                        📈 提出率
                    </button>
                </div>
                <div class="dashboard-content" id="dashboard-content">
                    <p class="loading-message">データを読み込み中...</p>
                </div>
            </div>
        `;
    }

    private addViewSwitchListeners() {
        const buttons = this.container.querySelectorAll('.dashboard-nav-btn');
        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                const view = (btn as HTMLElement).getAttribute('data-view') as typeof this.activeView;
                if (view && view !== this.activeView) {
                    this.activeView = view;
                    // update active class
                    buttons.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    this.renderActiveView();
                }
            });
        });
    }

    // ========== データ取得 ==========

    private async loadAllData() {
        const content = this.container.querySelector('#dashboard-content');
        if (!content) return;
        content.innerHTML = '<p class="loading-message">全コースのデータを取得中...</p>';


        const baseURL = getBaseURL();
        const courses = this.courses;

        // 課題・クイズ・お知らせを並列で取得
        const [assignmentResults, quizResults, announcementResults] = await Promise.all([
            this.fetchAllAssignments(baseURL, courses),
            this.fetchAllQuizzes(baseURL, courses),
            this.fetchAllAnnouncements(baseURL, courses),
        ]);

        this.assignments = assignmentResults;
        this.quizzes = quizResults;
        this.announcements = announcementResults;


        this.renderActiveView();
    }

    private async fetchAllAssignments(baseURL: string, courses: Course[]): Promise<DashboardAssignment[]> {
        const results: DashboardAssignment[] = [];
        const promises = courses.map(async (course) => {
            try {
                const assignment = await fetchAssignment(course, false);
                for (const entry of assignment.entries) {
                    results.push({
                        id: entry.id,
                        title: entry.title,
                        courseName: course.name || course.id,
                        courseId: course.id,
                        dueTime: entry.dueTime,
                        closeTime: entry.closeTime,
                        submitted: entry.submitted || false,
                    });
                }
            } catch { /* skip failed courses */ }
        });
        await Promise.allSettled(promises);
        return results.sort((a, b) => a.dueTime - b.dueTime);
    }

    private async fetchAllQuizzes(baseURL: string, courses: Course[]): Promise<DashboardQuiz[]> {
        const results: DashboardQuiz[] = [];
        const promises = courses.map(async (course) => {
            try {
                const quiz = await fetchQuiz(course, false);
                for (const entry of quiz.entries) {
                    results.push({
                        id: entry.id,
                        title: entry.title,
                        courseName: course.name || course.id,
                        courseId: course.id,
                        dueTime: entry.dueTime,
                    });
                }
            } catch { /* skip failed courses */ }
        });
        await Promise.allSettled(promises);
        return results.sort((a, b) => a.dueTime - b.dueTime);
    }

    private async fetchAllAnnouncements(baseURL: string, courses: Course[]): Promise<DashboardAnnouncement[]> {
        const results: DashboardAnnouncement[] = [];
        const promises = courses.map(async (course) => {
            try {
                const url = `${baseURL}/direct/announcement/site/${course.id}.json?n=50`;
                const res = await fetch(url, { cache: 'no-cache', credentials: 'include' });
                if (res.ok) {
                    const data = await res.json();
                    const items = data.announcement_collection || [];
                    for (const a of items) {
                        results.push({
                            announcementId: a.announcementId || a.id,
                            title: a.title || '',
                            body: a.body || '',
                            courseName: course.name || course.id,
                            courseId: course.id,
                            createdOn: a.createdOn || 0,
                            createdByDisplayName: a.createdByDisplayName,
                            attachments: a.attachments,
                        });
                    }
                }
            } catch { /* skip */ }
        });
        await Promise.allSettled(promises);
        return results.sort((a, b) => b.createdOn - a.createdOn);
    }

    // ========== ビュー描画 ==========

    private renderActiveView() {
        const content = this.container.querySelector('#dashboard-content');
        if (!content) return;

        switch (this.activeView) {
            case 'weekly':
                content.innerHTML = this.renderWeeklyDashboard();
                this.addWeeklyListeners(content);
                break;
            case 'timeline':
                content.innerHTML = this.renderAnnouncementTimeline();
                this.addTimelineListeners(content);
                break;
            case 'workload':
                content.innerHTML = this.renderWorkloadView();
                break;
            case 'submission':
                content.innerHTML = this.renderSubmissionTracker();
                break;
        }
    }

    // ========== 1. 週次ダッシュボード ==========

    private renderWeeklyDashboard(): string {
        const dayMs = 86400;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayUnix = Math.floor(today.getTime() / 1000);

        // 今日から14日間の範囲でフィルタ
        const rangeEnd = todayUnix + 14 * dayMs;
        const items: Array<{ type: 'assignment' | 'quiz'; title: string; courseName: string; dueTime: number; submitted?: boolean; id: string; courseId: string }> = [];

        for (const a of this.assignments) {
            if (a.dueTime >= todayUnix && a.dueTime < rangeEnd) {
                items.push({ type: 'assignment', title: a.title, courseName: a.courseName, dueTime: a.dueTime, submitted: a.submitted, id: a.id, courseId: a.courseId });
            }
        }
        for (const q of this.quizzes) {
            if (q.dueTime >= todayUnix && q.dueTime < rangeEnd) {
                items.push({ type: 'quiz', title: q.title, courseName: q.courseName, dueTime: q.dueTime, id: q.id, courseId: q.courseId });
            }
        }

        // 日付ごとにグループ化
        const dayLabels = ['日', '月', '火', '水', '木', '金', '土'];
        let ganttHTML = '<div class="weekly-gantt">';

        // 統計サマリー
        const totalAssignments = this.assignments.filter(a => a.dueTime >= todayUnix && a.dueTime < rangeEnd).length;
        const totalQuizzes = this.quizzes.filter(q => q.dueTime >= todayUnix && q.dueTime < rangeEnd).length;
        const unsubmitted = this.assignments.filter(a => a.dueTime >= todayUnix && a.dueTime < rangeEnd && !a.submitted).length;

        ganttHTML += `
            <div class="weekly-summary">
                <div class="summary-card">
                    <span class="summary-number">${totalAssignments}</span>
                    <span class="summary-label">課題</span>
                </div>
                <div class="summary-card">
                    <span class="summary-number">${totalQuizzes}</span>
                    <span class="summary-label">小テスト</span>
                </div>
                <div class="summary-card summary-alert">
                    <span class="summary-number">${unsubmitted}</span>
                    <span class="summary-label">未提出</span>
                </div>
            </div>
        `;

        // ガントチャート風の日付行
        ganttHTML += '<div class="gantt-grid">';

        for (let d = 0; d < 14; d++) {
            const dayStart = todayUnix + d * dayMs;
            const dayEnd = dayStart + dayMs;
            const date = new Date(dayStart * 1000);
            const dayLabel = dayLabels[date.getDay()];
            const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;
            const isToday = d === 0;
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;

            const dayItems = items.filter(it => it.dueTime >= dayStart && it.dueTime < dayEnd);

            let urgencyClass = '';
            if (d === 0) urgencyClass = 'gantt-day-today';
            else if (d <= 1) urgencyClass = 'gantt-day-urgent';
            else if (d <= 5) urgencyClass = 'gantt-day-soon';

            ganttHTML += `
                <div class="gantt-row ${urgencyClass} ${isWeekend ? 'gantt-weekend' : ''}">
                    <div class="gantt-date">
                        <span class="gantt-date-label">${dateStr}</span>
                        <span class="gantt-day-name ${isToday ? 'today-badge' : ''}">${isToday ? '今日' : dayLabel}</span>
                    </div>
                    <div class="gantt-items">
                        ${dayItems.length === 0 ? '<span class="gantt-empty">-</span>' :
                            dayItems.map(it => {
                                const time = new Date(it.dueTime * 1000);
                                const timeStr = `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}`;
                                const badge = it.type === 'assignment' ? 'badge-assignment' : 'badge-quiz';
                                const submittedClass = it.submitted ? 'item-submitted' : '';
                                const typeLabel = it.type === 'assignment' ? '課題' : '小テスト';
                                return `
                                    <div class="gantt-item ${badge} ${submittedClass}" data-id="${it.id}" data-course-id="${it.courseId}" data-type="${it.type}">
                                        <span class="gantt-time">${timeStr}</span>
                                        <span class="gantt-type-badge">${typeLabel}</span>
                                        <span class="gantt-item-title">${it.title}</span>
                                        <span class="gantt-course">${it.courseName}</span>
                                        ${it.submitted ? '<span class="gantt-submitted-badge">提出済</span>' : ''}
                                    </div>
                                `;
                            }).join('')
                        }
                    </div>
                </div>
            `;
        }

        ganttHTML += '</div>';

        // 添付ファイル一括ダウンロードセクション (機能5)
        ganttHTML += this.renderBulkDownloadSection();

        ganttHTML += '</div>';
        return ganttHTML;
    }

    private addWeeklyListeners(content: Element) {
        // 課題項目クリックで詳細ポップアップ
        const items = content.querySelectorAll('.gantt-item');
        items.forEach(item => {
            item.addEventListener('click', () => {
                const id = item.getAttribute('data-id');
                const type = item.getAttribute('data-type');
                const courseId = item.getAttribute('data-course-id');
                if (id && courseId) {
                    const baseURL = getBaseURL();
                    if (type === 'assignment') {
                        window.open(`${baseURL}/portal/site/${courseId}/tool-reset/sakai.assignment.grades`, '_blank');
                    }
                }
            });
            (item as HTMLElement).style.cursor = 'pointer';
        });

        // 一括ダウンロード
        this.addBulkDownloadListeners(content);
    }

    // ========== 5. 課題添付ファイル一括ダウンロード ==========

    private renderBulkDownloadSection(): string {
        return `
            <div class="bulk-download-section">
                <h4>📎 課題添付ファイル一括ダウンロード</h4>
                <p class="bulk-download-desc">各コースの課題詳細から添付ファイルを取得してダウンロードできます。</p>
                <button class="btn btn-primary" id="fetch-attachments-btn">
                    添付ファイルを検索
                </button>
                <div id="attachments-list-container"></div>
            </div>
        `;
    }

    private addBulkDownloadListeners(content: Element) {
        const fetchBtn = content.querySelector('#fetch-attachments-btn');
        if (fetchBtn) {
            fetchBtn.addEventListener('click', async () => {
                (fetchBtn as HTMLButtonElement).disabled = true;
                (fetchBtn as HTMLButtonElement).textContent = '検索中...';
                await this.fetchAndRenderAttachments(content);
                (fetchBtn as HTMLButtonElement).disabled = false;
                (fetchBtn as HTMLButtonElement).textContent = '添付ファイルを検索';
            });
        }
    }

    private async fetchAndRenderAttachments(content: Element) {
        const container = content.querySelector('#attachments-list-container');
        if (!container) return;

        const baseURL = getBaseURL();
        const now = Math.floor(Date.now() / 1000);
        const activeAssignments = this.assignments.filter(a => a.dueTime > now);

        container.innerHTML = '<p class="loading-message">課題詳細を取得中...</p>';

        const allAttachments: Array<{ assignmentTitle: string; courseName: string; name: string; url: string; size?: string }> = [];

        // 各課題の詳細をAPIから取得して添付ファイルを収集
        const promises = activeAssignments.map(async (assignment) => {
            try {
                const url = `${baseURL}/direct/assignment/${assignment.id}.json`;
                const res = await fetch(url, { cache: 'no-cache', credentials: 'include' });
                if (res.ok) {
                    const data = await res.json();
                    if (data.attachments && data.attachments.length > 0) {
                        for (const att of data.attachments) {
                            allAttachments.push({
                                assignmentTitle: assignment.title,
                                courseName: assignment.courseName,
                                name: att.name || 'file',
                                url: att.url || '',
                                size: att.size,
                            });
                        }
                    }
                }
            } catch { /* skip */ }
        });

        await Promise.allSettled(promises);

        if (allAttachments.length === 0) {
            container.innerHTML = '<p class="info-message">添付ファイルは見つかりませんでした</p>';
            return;
        }

        container.innerHTML = `
            <div class="bulk-attachments">
                <div class="download-controls">
                    <button class="download-btn" id="bulk-download-btn" disabled>選択したファイルをダウンロード</button>
                    <span class="selected-count">(0件選択)</span>
                    <button class="btn btn-secondary" id="select-all-attachments">全選択</button>
                </div>
                <div class="attachments-list">
                    ${allAttachments.map((att, i) => `
                        <div class="attachment-row">
                            <input type="checkbox" class="bulk-attachment-cb" data-url="${att.url}" data-filename="${att.name}" id="bulk-att-${i}">
                            <label for="bulk-att-${i}">
                                <span class="att-course">${att.courseName}</span>
                                <span class="att-assignment">${att.assignmentTitle}</span>
                                <span class="att-filename">${att.name}</span>
                                ${att.size ? `<span class="att-size">(${att.size})</span>` : ''}
                            </label>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        // チェックボックスとダウンロード
        const dlBtn = container.querySelector('#bulk-download-btn') as HTMLButtonElement;
        const countSpan = container.querySelector('.selected-count') as HTMLSpanElement;
        const cbs = container.querySelectorAll('.bulk-attachment-cb') as NodeListOf<HTMLInputElement>;
        const selectAllBtn = container.querySelector('#select-all-attachments');

        const updateCount = () => {
            const count = Array.from(cbs).filter(c => c.checked).length;
            countSpan.textContent = `(${count}件選択)`;
            dlBtn.disabled = count === 0;
        };

        cbs.forEach(cb => cb.addEventListener('change', updateCount));
        selectAllBtn?.addEventListener('click', () => {
            const allChecked = Array.from(cbs).every(c => c.checked);
            cbs.forEach(c => c.checked = !allChecked);
            updateCount();
        });

        dlBtn.addEventListener('click', async () => {
            const selected = Array.from(cbs).filter(c => c.checked);
            dlBtn.disabled = true;
            dlBtn.textContent = 'ダウンロード中...';
            for (const cb of selected) {
                const url = cb.getAttribute('data-url');
                const filename = cb.getAttribute('data-filename');
                if (url && filename) {
                    try {
                        const res = await fetch(url, { credentials: 'include' });
                        const blob = await res.blob();
                        const a = document.createElement('a');
                        a.href = URL.createObjectURL(blob);
                        a.download = filename;
                        a.click();
                        URL.revokeObjectURL(a.href);
                        await new Promise(r => setTimeout(r, 500));
                    } catch (e) {
                        console.error(`ダウンロード失敗: ${filename}`, e);
                    }
                }
            }
            dlBtn.textContent = '選択したファイルをダウンロード';
            dlBtn.disabled = false;
            selected.forEach(c => c.checked = false);
            updateCount();
        });
    }

    // ========== 4. お知らせタイムライン ==========

    private renderAnnouncementTimeline(): string {
        if (this.announcements.length === 0) {
            return '<p class="info-message">お知らせはありません</p>';
        }

        const now = Date.now();
        let html = '<div class="announcement-timeline">';

        // 日付でグループ化
        const grouped = new Map<string, DashboardAnnouncement[]>();
        for (const a of this.announcements) {
            const date = new Date(a.createdOn);
            const key = `${date.getFullYear()}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}`;
            if (!grouped.has(key)) grouped.set(key, []);
            grouped.get(key)!.push(a);
        }

        for (const [dateStr, items] of grouped) {
            const daysAgo = Math.floor((now - new Date(dateStr).getTime()) / 86400000);
            const relativeLabel = daysAgo === 0 ? '今日' : daysAgo === 1 ? '昨日' : `${daysAgo}日前`;

            html += `
                <div class="timeline-date-group">
                    <div class="timeline-date-header">
                        <span class="timeline-date">${dateStr}</span>
                        <span class="timeline-relative">${relativeLabel}</span>
                        <span class="timeline-count">${items.length}件</span>
                    </div>
                    ${items.map(a => {
                        const time = new Date(a.createdOn);
                        const timeStr = `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}`;
                        const bodyPreview = a.body.replace(/<[^>]+>/g, '').slice(0, 100);
                        return `
                            <div class="timeline-item" data-announcement-id="${a.announcementId}">
                                <div class="timeline-dot"></div>
                                <div class="timeline-content">
                                    <div class="timeline-item-header">
                                        <span class="timeline-course-badge">${a.courseName}</span>
                                        <span class="timeline-time">${timeStr}</span>
                                    </div>
                                    <h4 class="timeline-title">${a.title}</h4>
                                    <p class="timeline-preview">${bodyPreview}${bodyPreview.length >= 100 ? '...' : ''}</p>
                                    ${a.createdByDisplayName ? `<span class="timeline-author">${a.createdByDisplayName}</span>` : ''}
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        }

        html += '</div>';
        return html;
    }

    private addTimelineListeners(content: Element) {
        const items = content.querySelectorAll('.timeline-item');
        items.forEach(item => {
            item.addEventListener('click', () => {
                const id = item.getAttribute('data-announcement-id');
                const announcement = this.announcements.find(a => a.announcementId === id);
                if (announcement) {
                    this.showAnnouncementModal(announcement);
                }
            });
            (item as HTMLElement).style.cursor = 'pointer';
        });
    }

    private showAnnouncementModal(a: DashboardAnnouncement) {
        // 既存モーダルを削除
        const existing = document.querySelector('.dashboard-detail-modal');
        if (existing) existing.remove();

        const modal = document.createElement('div');
        modal.className = 'dashboard-detail-modal';
        modal.innerHTML = `
            <div class="dashboard-modal-overlay"></div>
            <div class="dashboard-modal-box">
                <div class="dashboard-modal-header">
                    <h3>${a.title}</h3>
                    <button class="dashboard-modal-close">&times;</button>
                </div>
                <div class="dashboard-modal-body">
                    <div class="dashboard-modal-meta">
                        <span class="timeline-course-badge">${a.courseName}</span>
                        <span>${a.createdByDisplayName || ''}</span>
                        <span>${new Date(a.createdOn).toLocaleString('ja-JP')}</span>
                    </div>
                    <div class="dashboard-modal-content">${a.body}</div>
                    ${a.attachments && a.attachments.length > 0 ? `
                        <div class="dashboard-modal-attachments">
                            <h4>添付ファイル</h4>
                            ${a.attachments.map(att => `
                                <a href="${att.url}" target="_blank" class="attachment-link">${att.name}</a>
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        const close = () => modal.remove();
        modal.querySelector('.dashboard-modal-close')?.addEventListener('click', close);
        modal.querySelector('.dashboard-modal-overlay')?.addEventListener('click', close);
        document.addEventListener('keydown', function handler(e) {
            if (e.key === 'Escape') { close(); document.removeEventListener('keydown', handler); }
        });
    }

    // ========== 6. 学習負荷の可視化 ==========

    private renderWorkloadView(): string {
        const dayMs = 86400;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayUnix = Math.floor(today.getTime() / 1000);

        // 4週間分のヒートマップ
        const weeks = 4;
        const totalDays = weeks * 7;
        const dayLabels = ['日', '月', '火', '水', '木', '金', '土'];

        // 日ごとのタスク数を集計
        const dayCounts: { date: Date; assignments: number; quizzes: number; total: number }[] = [];

        for (let d = 0; d < totalDays; d++) {
            const dayStart = todayUnix + d * dayMs;
            const dayEnd = dayStart + dayMs;
            const date = new Date(dayStart * 1000);
            const assignmentCount = this.assignments.filter(a => a.dueTime >= dayStart && a.dueTime < dayEnd).length;
            const quizCount = this.quizzes.filter(q => q.dueTime >= dayStart && q.dueTime < dayEnd).length;
            dayCounts.push({ date, assignments: assignmentCount, quizzes: quizCount, total: assignmentCount + quizCount });
        }

        const maxCount = Math.max(...dayCounts.map(d => d.total), 1);

        // 週ごとのサマリー
        let html = '<div class="workload-view">';

        // ヒートマップヘッダー
        html += '<div class="heatmap-header">';
        for (const label of dayLabels) {
            html += `<span class="heatmap-day-label">${label}</span>`;
        }
        html += '</div>';

        // ヒートマップグリッド
        html += '<div class="heatmap-grid">';
        for (let w = 0; w < weeks; w++) {
            const weekStartDate = dayCounts[w * 7].date;
            const weekLabel = `${weekStartDate.getMonth() + 1}/${weekStartDate.getDate()}-`;

            html += `<div class="heatmap-week">`;
            html += `<span class="heatmap-week-label">${weekLabel}</span>`;

            for (let d = 0; d < 7; d++) {
                const idx = w * 7 + d;
                if (idx >= totalDays) break;
                const data = dayCounts[idx];
                const intensity = data.total / maxCount;
                let colorClass = 'heat-0';
                if (intensity > 0.75) colorClass = 'heat-4';
                else if (intensity > 0.5) colorClass = 'heat-3';
                else if (intensity > 0.25) colorClass = 'heat-2';
                else if (intensity > 0) colorClass = 'heat-1';

                const isToday = idx === 0;
                const dateStr = `${data.date.getMonth() + 1}/${data.date.getDate()}`;

                html += `
                    <div class="heatmap-cell ${colorClass} ${isToday ? 'heatmap-today' : ''}"
                         title="${dateStr}: 課題${data.assignments}件 + 小テスト${data.quizzes}件">
                        <span class="heatmap-count">${data.total > 0 ? data.total : ''}</span>
                    </div>
                `;
            }
            html += '</div>';
        }
        html += '</div>';

        // 凡例
        html += `
            <div class="heatmap-legend">
                <span>少ない</span>
                <div class="heatmap-cell heat-0 legend-cell"></div>
                <div class="heatmap-cell heat-1 legend-cell"></div>
                <div class="heatmap-cell heat-2 legend-cell"></div>
                <div class="heatmap-cell heat-3 legend-cell"></div>
                <div class="heatmap-cell heat-4 legend-cell"></div>
                <span>多い</span>
            </div>
        `;

        // 週間サマリーバー
        html += '<div class="weekly-bars">';
        for (let w = 0; w < weeks; w++) {
            const weekData = dayCounts.slice(w * 7, w * 7 + 7);
            const weekAssignments = weekData.reduce((s, d) => s + d.assignments, 0);
            const weekQuizzes = weekData.reduce((s, d) => s + d.quizzes, 0);
            const weekTotal = weekAssignments + weekQuizzes;
            const label = w === 0 ? '今週' : `${w + 1}週目`;
            const maxBarWidth = 200;

            html += `
                <div class="weekly-bar-row">
                    <span class="bar-label">${label}</span>
                    <div class="bar-container">
                        <div class="bar-segment bar-assignment" style="width: ${Math.min(weekAssignments * 20, maxBarWidth)}px"></div>
                        <div class="bar-segment bar-quiz" style="width: ${Math.min(weekQuizzes * 20, maxBarWidth)}px"></div>
                    </div>
                    <span class="bar-count">課題${weekAssignments} + 小テスト${weekQuizzes} = ${weekTotal}件</span>
                </div>
            `;
        }
        html += '</div>';

        // 負荷予測テキスト
        const thisWeek = dayCounts.slice(0, 7).reduce((s, d) => s + d.total, 0);
        const nextWeek = dayCounts.slice(7, 14).reduce((s, d) => s + d.total, 0);
        let loadMessage = '';
        if (thisWeek >= 5) loadMessage = '今週はタスクが多い週です。計画的に取り組みましょう。';
        else if (thisWeek >= 3) loadMessage = '今週は平均的な負荷です。';
        else loadMessage = '今週は比較的余裕があります。';

        if (nextWeek > thisWeek) loadMessage += ` 来週はさらに${nextWeek - thisWeek}件多くなる見込みです。`;

        html += `<div class="workload-message">${loadMessage}</div>`;
        html += '</div>';

        return html;
    }

    // ========== 7. 提出率トラッカー ==========

    private renderSubmissionTracker(): string {
        // コースごとの提出率を計算
        const courseStats = new Map<string, { courseName: string; total: number; submitted: number }>();

        for (const a of this.assignments) {
            if (!courseStats.has(a.courseId)) {
                courseStats.set(a.courseId, { courseName: a.courseName, total: 0, submitted: 0 });
            }
            const stat = courseStats.get(a.courseId)!;
            stat.total++;
            if (a.submitted) stat.submitted++;
        }

        const stats = Array.from(courseStats.values()).filter(s => s.total > 0);
        const overallTotal = stats.reduce((s, c) => s + c.total, 0);
        const overallSubmitted = stats.reduce((s, c) => s + c.submitted, 0);
        const overallRate = overallTotal > 0 ? Math.round((overallSubmitted / overallTotal) * 100) : 0;

        let html = '<div class="submission-tracker">';

        // 全体統計
        html += `
            <div class="overall-stats">
                <div class="overall-circle">
                    <svg viewBox="0 0 120 120" class="progress-ring">
                        <circle class="progress-ring-bg" cx="60" cy="60" r="52" />
                        <circle class="progress-ring-fill" cx="60" cy="60" r="52"
                                style="stroke-dasharray: ${2 * Math.PI * 52}; stroke-dashoffset: ${2 * Math.PI * 52 * (1 - overallRate / 100)}" />
                    </svg>
                    <div class="overall-rate">${overallRate}%</div>
                </div>
                <div class="overall-detail">
                    <h4>全体の提出率</h4>
                    <p>${overallSubmitted} / ${overallTotal} 件提出済み</p>
                </div>
            </div>
        `;

        // コース別の提出率バー
        html += '<div class="course-submission-list">';
        for (const stat of stats.sort((a, b) => (a.submitted / a.total) - (b.submitted / b.total))) {
            const rate = Math.round((stat.submitted / stat.total) * 100);
            let barColor = 'bar-danger';
            if (rate >= 80) barColor = 'bar-success';
            else if (rate >= 50) barColor = 'bar-warning';

            html += `
                <div class="course-submission-row">
                    <div class="course-submission-name">${stat.courseName}</div>
                    <div class="course-submission-bar-container">
                        <div class="course-submission-bar ${barColor}" style="width: ${rate}%"></div>
                    </div>
                    <div class="course-submission-rate">${rate}% (${stat.submitted}/${stat.total})</div>
                </div>
            `;
        }
        html += '</div></div>';

        return html;
    }
}
