/**
 * -----------------------------------------------------------------
 * Modified by: roz
 * Date       : 2025-05-28
 * Changes    : TACT機能の初期化とカレンダー自動同期機能を追加
 * Category   : 機能拡張
 * -----------------------------------------------------------------
 */
// filepath: /home/rozwer/sakai/comfortable-sakai/src/content_script.ts
import { saveHostName } from "./features/storage";
import { createMiniSakai, addMiniSakaiBtn } from "./minisakai";
import { isLoggedIn, miniSakaiReady, getCourseSiteID } from "./utils";
/**
 * -----------------------------------------------------------------
 * Modified by: roz
 * Date       : 2025-05-28
 * Changes    : TACT機能とカレンダー同期に必要なインポートを追加
 * Category   : 機能拡張
 * -----------------------------------------------------------------
 */
import { isTactPortal, initializeTactFeatures } from "./features/tact/index-new";
import { fetchCourse } from "./features/api/fetch";
import { getAssignments } from "./features/entity/assignment/getAssignment";
import { getQuizzes } from "./features/entity/quiz/getQuiz";
import { getFetchTime, shouldUseCache, formatCount, formatDate } from "./utils";
import { Settings } from "./features/setting/types";
import { i18nMessage } from "./features/chrome";
/**
 * -----------------------------------------------------------------
 * Modified by: roz
 * Date       : 2025-08-14
 * Changes    : コースページを開いた際に返却通知（Bullhorn）を既読化し、黄色バッジを消去
 * Category   : 通知・UX
 * -----------------------------------------------------------------
 */
import { fetchBullhornAlerts, extractReturnAlerts, dedupeLatestByAssignment } from "./features/notification/bullhorn";
import { getReadMap, isUnread, markReadBulk } from "./features/notification/store";

/**
 * Creates miniSakai.
 */
async function main() {
    if (isLoggedIn()) {
        addMiniSakaiBtn();
        const hostname = window.location.hostname;
        createMiniSakai(hostname);

        miniSakaiReady();
        await saveHostName(hostname);

        // コースページを開いたら、そのコースに紐づく未読返却通知を既読化し、黄色バッジを消す
        try {
            const courseId = getCourseSiteID(window.location.href);
            if (courseId) {
                const readMap = await getReadMap(hostname);
                const alerts = await fetchBullhornAlerts(true);
                const returns = dedupeLatestByAssignment(extractReturnAlerts(alerts));
                const target = returns.filter(a => a.siteId === courseId && isUnread(readMap, a.id));
                if (target.length > 0) {
                    await markReadBulk(hostname, target.map(t => t.id));
                    // 見た目上の即時反映：該当タブから黄色バッジクラスを除去
                    const tabs = document.querySelectorAll(".Mrphs-sitesNav__menuitem");
                    for (let j = 0; j < tabs.length; j++) {
                        const aTag = (tabs[j] as HTMLElement).getElementsByClassName("link-container")[0] as HTMLAnchorElement | undefined;
                        const href = aTag?.href;
                        const hrefContent = href?.match("(https?://[^/]+)/portal/site-?[a-z]*/([^/]+)");
                        if (hrefContent && hrefContent[2] === courseId) {
                            (tabs[j] as HTMLElement).classList.remove("cs-return-badge");
                        }
                    }
                }
            }
        } catch {}
        
        /**
         * -----------------------------------------------------------------
         * Modified by: roz
         * Date       : 2025-05-28
         * Changes    : カレンダー自動同期のチェック機能を追加
         * Category   : 機能拡張
         * -----------------------------------------------------------------
         */
        // 自動同期（ページ滞在時に定期チェックして必要なら実行）
        setupAutoSyncCheck();
    }
    
    /**
     * -----------------------------------------------------------------
     * Modified by: roz
     * Date       : 2025-05-28
     * Changes    : TACTポータル用の機能初期化を追加
     * Category   : 機能拡張
     * -----------------------------------------------------------------
     */
    // TACTポータル用の機能を追加
    if (isTactPortal()) {
        // DOMが完全にロードされてから実行
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initTactFeatures);
        } else {
            initTactFeatures();
        }
    }
}

/**
 * -----------------------------------------------------------------
 * Modified by: roz
 * Date       : 2025-05-28
 * Changes    : TACTポータル用の機能を初期化する関数を追加
 * Category   : 機能拡張
 * -----------------------------------------------------------------
 */
/**
 * TACTポータル用の機能を初期化
 */
function initTactFeatures() {
    console.log('TACT Portal detected - initializing custom tabs');
    // ツールナビゲーションが読み込まれるまで待つ
    const checkToolMenu = setInterval(() => {
        const toolMenu = document.querySelector('#toolMenu ul');
        if (toolMenu) {
            clearInterval(checkToolMenu);
            // TACT機能を初期化
            initializeTactFeatures();
        }
    }, 500);
}

/**
 * -----------------------------------------------------------------
 * Modified by: roz
 * Date       : 2025-05-28
 * Changes    : カレンダー自動同期のメッセージリスナーとチェック機能を追加
 * Category   : 機能拡張
 * -----------------------------------------------------------------
 */
// TACTポータルでメッセージリスナーを設定
function setupAutoSyncCheck() {
    // バックグラウンドからの同期リクエストのリスナーを追加
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'getSakaiDataForSync') {
            console.log('バックグラウンドからデータ取得リクエストを受信しました');
            // データを取得して返す
            getSakaiDataForSync().then(data => {
                sendResponse({ success: true, data });
            }).catch(error => {
                sendResponse({ success: false, error: String(error) });
            });
            return true; // 非同期レスポンスを示す
        } else if (request.action === 'syncCompleted') {
            console.log(`同期完了通知: 課題${request.result.assignments}件、クイズ${request.result.quizzes}件`);
            // 最終同期時刻を更新
            chrome.storage.local.set({ lastSyncTime: Date.now() });
            // 同期完了のUI通知を表示
            showSyncNotification(request.result);
        }
    });
    
    // 初期同期チェック
    setTimeout(checkAndSyncIfNeeded, 5000);
    // 周期チェック（運用: 5分ごと）
    const PERIOD_MS = 5 * 60 * 1000;
    setInterval(checkAndSyncIfNeeded, PERIOD_MS);
}

// 自動同期の条件をチェックし、必要なら同期を実行
async function checkAndSyncIfNeeded() {
    // Backgroundに自動同期の条件を確認
    chrome.runtime.sendMessage({ action: 'checkAutoSync' }, async (response) => {
        if (chrome.runtime.lastError) {
            console.error('自動同期チェックエラー:', chrome.runtime.lastError);
            return;
        }
        
        // 同期条件を満たしていれば実行
        if (response && response.success && response.shouldSync) {
            console.log('自動同期条件を満たしました - 同期を開始します');
            await performAutoSync();
        }
    });
}

/**
 * -----------------------------------------------------------------
 * Modified by: roz
 * Date       : 2025-05-28
 * Changes    : 自動同期実行機能を追加（課題・クイズデータの取得とカレンダー同期）
 * Category   : 機能拡張
 * -----------------------------------------------------------------
 */
// 自動同期を実行
async function performAutoSync() {
    try {
        // 1) ページからデータ取得（未来のみ）
        const data = await getSakaiDataForSync();
        if ((!data?.assignments || data.assignments.length === 0) && (!data?.quizzes || data.quizzes.length === 0)) {
            console.log('自動同期: 同期対象なし');
            // 情報通知（新規なし）
            try { showSyncNotification({ assignments: 0, quizzes: 0, errors: 0 as any }); } catch {}
            return;
        }
        // 2) 既存トークンのみ使用（非対話）。無ければ自動同期はスキップ
        const token = await new Promise<string | null>((resolve) => {
            try { chrome.storage.local.get(['google_auth_token'], r => resolve((r?.google_auth_token as string) || null)); }
            catch { resolve(null); }
        });
        if (!token) { console.log('自動同期: トークンなしのためスキップ'); return; }
        // 軽量に有効性チェック
        try {
            const testParams = new URLSearchParams({ maxResults: '1', timeMin: new Date(Date.now() - 5*60*1000).toISOString() });
            const test = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${testParams.toString()}`, { headers: { Authorization: `Bearer ${token}` } });
            if (!test.ok) { console.log('自動同期: トークン無効のためスキップ'); return; }
        } catch (_) { console.log('自動同期: トークン検証失敗のためスキップ'); return; }

        // 3) Background 経由で同期（手動用エンドポイントを使用）
        const result = await new Promise<any>((resolve, reject) => {
            chrome.runtime.sendMessage({ action: 'manualSyncToCalendar', data, token }, (r) => {
                if (chrome.runtime.lastError) { reject(new Error(chrome.runtime.lastError.message)); return; }
                if (!r || !r.success) { reject(new Error(r?.error || 'manualSyncToCalendar 失敗')); return; }
                resolve(r.result);
            });
        });
        const totalA = (result?.assignments?.length||0);
        const totalQ = (result?.quizzes?.length||0);
        const totalE = (result?.errors?.length||0);
        console.log(`自動同期完了: ${totalA+totalQ}件作成 / エラー${totalE}`);
        // UI通知
        try { showSyncNotification({ assignments: totalA, quizzes: totalQ, errors: totalE }); } catch {}
        // 4) 最終同期時刻を保存
        chrome.storage.local.set({ lastSyncTime: Date.now(), lastSyncResult: { ts: Date.now(), assignments: totalA, quizzes: totalQ, errors: totalE } });
    } catch (error) {
        console.error('自動同期に失敗:', error);
    }
}

// syncToCalendar関数の定義
async function syncToCalendar(data: any): Promise<any> {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({
            action: 'syncToCalendar',
            data: data
        }, response => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else if (!response || !response.success) {
                reject(new Error(response?.error || 'Unknown error'));
            } else {
                resolve(response.result);
            }
        });
    });
}

// Sakai LMSからの課題・クイズデータを同期のために取得
async function getSakaiDataForSync(): Promise<any> {
    const hostname = window.location.hostname;
    const courses = fetchCourse();
    const settings = new Settings();
    const fetchTime = await getFetchTime(hostname);
    const now = Math.floor(Date.now() / 1000);
    // キャッシュ利用判定
    const useAssignmentCache = shouldUseCache(fetchTime.assignment, now, settings.cacheInterval.assignment);
    const useQuizCache = shouldUseCache(fetchTime.quiz, now, settings.cacheInterval.quiz);
    const assignments = await getAssignments(hostname, courses, useAssignmentCache);
    const quizzes = await getQuizzes(hostname, courses, useQuizCache);
    // 締切が今より前のものは除外
    const totalAssignmentEntries = assignments.flatMap((assignment: any) => assignment.entries)
        .filter((e: any) => (e.dueTime || e.dueDate) > now);
    const totalQuizEntries = quizzes.flatMap((quiz: any) => quiz.entries)
        .filter((e: any) => (e.dueTime || e.dueDate) > now);
    return {
        assignments: totalAssignmentEntries,
        quizzes: totalQuizEntries
    };
}

/**
 * -----------------------------------------------------------------
 * Modified by: roz
 * Date       : 2025-05-28
 * Changes    : カレンダー同期結果のUI通知表示機能を追加
 * Category   : UI機能
 * -----------------------------------------------------------------
 */
// UI通知を表示する関数
function showSyncNotification(result: { assignments: number, quizzes: number, errors?: number }) {
    // 通知要素が既に存在する場合は削除
    const existingNotification = document.getElementById('cs-sync-notification');
    if (existingNotification) {
        existingNotification.remove();
    }

    // 通知エレメントを作成
    const notification = document.createElement('div');
    notification.id = 'cs-sync-notification';
    notification.className = 'cs-sync-notification';
    
    // 結果に応じたスタイルとメッセージを設定
    const hasErrors = result.errors && result.errors > 0;
    const totalEvents = result.assignments + result.quizzes;
    
    if (hasErrors) {
        notification.classList.add('cs-sync-error');
        notification.innerHTML = `
            <div class="cs-sync-notification-header">
                <span class="cs-sync-icon">⚠️</span>
                <span>${i18nMessage('sync_error_title')}</span>
                <button class="cs-sync-close-btn">×</button>
            </div>
            <div class="cs-sync-notification-body">
                ${i18nMessage('sync_warning_body', [formatCount(totalEvents), formatCount(result.errors || 0)])}
            </div>
        `;
    } else if (totalEvents > 0) {
        notification.classList.add('cs-sync-success');
        notification.innerHTML = `
            <div class="cs-sync-notification-header">
                <span class="cs-sync-icon">✅</span>
                <span>${i18nMessage('sync_success_title')}</span>
                <button class="cs-sync-close-btn">×</button>
            </div>
            <div class="cs-sync-notification-body">
                ${i18nMessage('sync_success_body', [formatCount(result.assignments), formatCount(result.quizzes)])}
            </div>
        `;
    } else {
        notification.classList.add('cs-sync-info');
        notification.innerHTML = `
            <div class="cs-sync-notification-header">
                <span class="cs-sync-icon">ℹ️</span>
                <span>${i18nMessage('sync_info_title')}</span>
                <button class="cs-sync-close-btn">×</button>
            </div>
            <div class="cs-sync-notification-body">
                ${i18nMessage('sync_info_body')}
            </div>
        `;
    }
    
    // 通知を表示
    document.body.appendChild(notification);
    
    // 閉じるボタンのイベントリスナー
    const closeBtn = notification.querySelector('.cs-sync-close-btn');
    closeBtn?.addEventListener('click', () => {
        notification.remove();
    });
    
    // 自動消滅タイマー（8秒後）
    setTimeout(() => {
        if (notification.parentNode) {
            notification.classList.add('cs-sync-notification-fade');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 500);
        }
    }, 8000);
}


// lastSyncTimeを取得して表示を更新
function updateLastSyncTimeDisplay() {
    chrome.storage.local.get(['lastSyncTime'], (result) => {
        const label = document.getElementById('cs-last-sync-label');
        if (!label) return;
        const t = result.lastSyncTime;
        if (!t) {
            label.textContent = i18nMessage('last_sync_none');
        } else {
            const d = new Date(t);
            label.textContent = i18nMessage('last_sync_at', [formatDate(d)]);
        }
    });
}



main();

// 手動同期用: ポップアップからのデータ取得要求に応答
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request && request.action === 'getSakaiDataForSync') {
        getSakaiDataForSync()
            .then((data) => sendResponse({ success: true, data }))
            .catch((err) => sendResponse({ success: false, error: String(err) }));
        return true; // async response
    }
});
