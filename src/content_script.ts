import { saveHostName } from "./features/storage";
import { createMiniSakai, addMiniSakaiBtn } from "./minisakai";
import { isLoggedIn, miniSakaiReady } from "./utils";
import { isTactPortal, initializeTactFeatures } from "./features/tact/index";
import { fetchCourse } from "./features/api/fetch";
import { getAssignments } from "./features/entity/assignment/getAssignment";
import { getQuizzes } from "./features/entity/quiz/getQuiz";
import { getFetchTime, shouldUseCache } from "./utils";
import { Settings } from "./features/setting/types";
import { EntryProtocol, EntityProtocol } from "./features/entity/type";

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
        
                // 自動同期チェックを設定
        setupAutoSyncCheck();
    }
    
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
 * TACTポータル用の機能を初期化
 */
function initTactFeatures() {
    console.log('TACT Portal detected - initializing custom tabs');
    // ツールナビゲーションが読み込まれるまで待つ（最大30秒）
    let attempts = 0;
    const maxAttempts = 60;
    const checkToolMenu = setInterval(() => {
        attempts++;
        const toolMenu = document.querySelector('#toolMenu ul');
        if (toolMenu) {
            clearInterval(checkToolMenu);
            initializeTactFeatures();
        } else if (attempts >= maxAttempts) {
            clearInterval(checkToolMenu);
            console.error('TACT tool menu not found after maximum attempts');
        }
    }, 500);
}

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

// 自動同期を実行
async function performAutoSync() {
    try {
        const data = await getSakaiDataForSync();

        if (data.assignments.length === 0 && data.quizzes.length === 0) {
            console.log('同期するデータが見つかりませんでした');
            return;
        }

        // Googleカレンダーに同期
        const result = await syncToCalendar(data);

        console.log(`自動同期完了: ${result.assignments.length + result.quizzes.length}件作成`);
    } catch (error) {
        console.error('自動同期に失敗:', error);
    }
}

// syncToCalendar関数の定義
interface SyncData {
    assignments: EntryProtocol[];
    quizzes: EntryProtocol[];
}
interface SyncResult {
    assignments: { title: string; success: boolean; eventId: string }[];
    quizzes: { title: string; success: boolean; eventId: string }[];
    errors: { type: string; title: string; error: string }[];
}
async function syncToCalendar(data: SyncData): Promise<SyncResult> {
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
async function getSakaiDataForSync(): Promise<SyncData> {
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
    const totalAssignmentEntries = assignments.flatMap((assignment: EntityProtocol) => assignment.entries)
        .filter((e: EntryProtocol) => e.dueTime > now);
    const totalQuizEntries = quizzes.flatMap((quiz: EntityProtocol) => quiz.entries)
        .filter((e: EntryProtocol) => e.dueTime > now);
    return {
        assignments: totalAssignmentEntries,
        quizzes: totalQuizEntries
    };
}

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
    
    let icon: string;
    let title: string;
    let body: string;

    if (hasErrors) {
        notification.classList.add('cs-sync-error');
        icon = '\u26A0\uFE0F';
        title = '\u30AB\u30EC\u30F3\u30C0\u30FC\u540C\u671F\u306E\u8B66\u544A';
        body = `${totalEvents}\u4EF6\u306E\u30A4\u30D9\u30F3\u30C8\u3092\u540C\u671F\u3057\u307E\u3057\u305F\u3002${result.errors}\u4EF6\u306E\u30A8\u30E9\u30FC\u304C\u767A\u751F\u3057\u307E\u3057\u305F\u3002`;
    } else if (totalEvents > 0) {
        notification.classList.add('cs-sync-success');
        icon = '\u2705';
        title = '\u30AB\u30EC\u30F3\u30C0\u30FC\u540C\u671F\u5B8C\u4E86';
        body = `${result.assignments}\u4EF6\u306E\u8AB2\u984C\u3068${result.quizzes}\u4EF6\u306E\u30AF\u30A4\u30BA\u3092\u30AB\u30EC\u30F3\u30C0\u30FC\u306B\u8FFD\u52A0\u3057\u307E\u3057\u305F`;
    } else {
        notification.classList.add('cs-sync-info');
        icon = '\u2139\uFE0F';
        title = '\u30AB\u30EC\u30F3\u30C0\u30FC\u540C\u671F\u60C5\u5831';
        body = '\u540C\u671F\u3059\u3079\u304D\u65B0\u3057\u3044\u30A4\u30D9\u30F3\u30C8\u306F\u3042\u308A\u307E\u305B\u3093\u3067\u3057\u305F';
    }

    const header = document.createElement('div');
    header.className = 'cs-sync-notification-header';
    const iconSpan = document.createElement('span');
    iconSpan.className = 'cs-sync-icon';
    iconSpan.textContent = icon;
    const titleSpan = document.createElement('span');
    titleSpan.textContent = title;
    const closeBtn = document.createElement('button');
    closeBtn.className = 'cs-sync-close-btn';
    closeBtn.textContent = '\u00D7';
    header.appendChild(iconSpan);
    header.appendChild(titleSpan);
    header.appendChild(closeBtn);

    const bodyDiv = document.createElement('div');
    bodyDiv.className = 'cs-sync-notification-body';
    bodyDiv.textContent = body;

    notification.appendChild(header);
    notification.appendChild(bodyDiv);
    
    // 通知を表示
    document.body.appendChild(notification);
    
    // 閉じるボタンのイベントリスナー
    closeBtn.addEventListener('click', () => {
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


main();
