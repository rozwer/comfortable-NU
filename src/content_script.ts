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
import { isLoggedIn, miniSakaiReady } from "./utils";
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
import { getFetchTime, shouldUseCache } from "./utils";
import { Settings } from "./features/setting/types";

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
        
        /**
         * -----------------------------------------------------------------
         * Modified by: roz
         * Date       : 2025-05-28
         * Changes    : カレンダー自動同期のチェック機能を追加
         * Category   : 機能拡張
         * -----------------------------------------------------------------
         */
        // 自動同期チェックを設定
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
        // 課題データを取得
        const hostname = window.location.hostname;
        const courses = fetchCourse();
        const assignments = await getAssignments(hostname, courses, false);
        const quizzes = await getQuizzes(hostname, courses, false);
        
        // 現在時刻取得
        const now = Math.floor(Date.now() / 1000);
        // 締切が今より前のものは除外
        const totalAssignmentEntries = assignments.flatMap((assignment: any) => assignment.entries)
            .filter((e: any) => (e.dueTime || e.dueDate) > now);
        const totalQuizEntries = quizzes.flatMap((quiz: any) => quiz.entries)
            .filter((e: any) => (e.dueTime || e.dueDate) > now);
        
        if (totalAssignmentEntries.length === 0 && totalQuizEntries.length === 0) {
            console.log('同期するデータが見つかりませんでした');
            return;
        }

        // Googleカレンダーに同期
        const result = await syncToCalendar({
            assignments: totalAssignmentEntries,
            quizzes: totalQuizEntries
        });
        
        // 最終同期時刻保存
        chrome.storage.local.set({ lastSyncTime: Date.now() });
        
        console.log(`自動同期完了: ${result.assignments.length + result.quizzes.length}件作成`);
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
                <span>カレンダー同期の警告</span>
                <button class="cs-sync-close-btn">×</button>
            </div>
            <div class="cs-sync-notification-body">
                ${totalEvents}件のイベントを同期しました。${result.errors}件のエラーが発生しました。
            </div>
        `;
    } else if (totalEvents > 0) {
        notification.classList.add('cs-sync-success');
        notification.innerHTML = `
            <div class="cs-sync-notification-header">
                <span class="cs-sync-icon">✅</span>
                <span>カレンダー同期完了</span>
                <button class="cs-sync-close-btn">×</button>
            </div>
            <div class="cs-sync-notification-body">
                ${result.assignments}件の課題と${result.quizzes}件のクイズをカレンダーに追加しました
            </div>
        `;
    } else {
        notification.classList.add('cs-sync-info');
        notification.innerHTML = `
            <div class="cs-sync-notification-header">
                <span class="cs-sync-icon">ℹ️</span>
                <span>カレンダー同期情報</span>
                <button class="cs-sync-close-btn">×</button>
            </div>
            <div class="cs-sync-notification-body">
                同期すべき新しいイベントはありませんでした
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
            label.textContent = '最終同期: なし';
        } else {
            const d = new Date(t);
            label.textContent = '最終同期: ' + d.toLocaleString();
        }
    });
}



main();
