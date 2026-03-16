/**
 * Google Calendarとの同期機能を提供
 * 課題とクイズの情報をGoogle Calendarに同期する
 */
// Google Calendar sync functionality
import { getAssignments } from './features/entity/assignment/getAssignment';
import { getQuizzes } from './features/entity/quiz/getQuiz';
import { fetchCourse } from './features/api/fetch';
import { formatDateToString } from './utils';
import { setStorageDirect } from './features/storage';
import { createLogger } from './utils/logger';
import type { GoogleAccount, SyncResult, ChromeMessage, ChromeResponse } from '../types/calendar-sync';

const logger = createLogger('calendarSync');

// Send message to background script
function sendMessage(action: string, data?: any): Promise<ChromeResponse> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ action, ...data } as ChromeMessage, (response: ChromeResponse) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else if (!response) {
        reject(new Error('No response from background script'));
      } else if (response.success) {
        resolve(response);
      } else {
        reject(new Error(response.error || 'Unknown error'));
      }
    });
  });
}

// Get Google accounts
export async function getGoogleAccounts(): Promise<GoogleAccount[]> {
  try {
    const response = await sendMessage('getGoogleAccounts');
    const accounts = response?.accounts;
    return Array.isArray(accounts) ? accounts : [];
  } catch (error) {
    logger.error('Failed to get Google accounts:', error);
    return [];
  }
}

// Authenticate with Google
export async function authenticateGoogle(): Promise<string> {
  logger.debug('authenticateGoogle called from UI');
  const response = await sendMessage('authenticateGoogle');
  if (!response.token) {
    throw new Error('No authentication token received');
  }
  return response.token;
}

// Logout from Google
export async function logoutGoogle(): Promise<void> {
  await sendMessage('logout');
}

// Sync data to Google Calendar
export async function syncToCalendar(assignments: any[], quizzes: any[], token?: string): Promise<SyncResult> {
  const response = await sendMessage('syncToCalendar', {
    data: { assignments, quizzes },
    token
  });
  if (!response.result) {
    throw new Error('No sync result received');
  }
  return response.result;
}

// 追加: ストレージ操作用ユーティリティ（エラーハンドリング付き）
function checkRuntimeError(): Error | null {
  if (chrome.runtime.lastError) {
    return new Error(chrome.runtime.lastError.message || 'Unknown chrome.storage error');
  }
  return null;
}

function clearSentEventKeys() {
  return new Promise<void>((resolve, reject) => {
    chrome.storage.local.remove('sentEventKeys', () => {
      const err = checkRuntimeError();
      if (err) { reject(err); return; }
      resolve();
    });
  });
}
function setSyncInterval(minutes: number): Promise<void> {
  return setStorageDirect({ calendarSyncInterval: minutes });
}
function getSyncInterval(): Promise<number> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(['calendarSyncInterval'], (result) => {
      const err = checkRuntimeError();
      if (err) { reject(err); return; }
      resolve(result.calendarSyncInterval || 240); // デフォルト240分
    });
  });
}
function setAutoSyncEnabled(enabled: boolean): Promise<void> {
  return setStorageDirect({ autoSyncEnabled: enabled });
}
function getAutoSyncEnabled(): Promise<boolean> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(['autoSyncEnabled'], (result) => {
      const err = checkRuntimeError();
      if (err) { reject(err); return; }
      resolve(result.autoSyncEnabled !== false); // デフォルトはtrue
    });
  });
}
function setLastSyncTime(time: number): Promise<void> {
  return setStorageDirect({ lastSyncTime: time });
}
function getLastSyncTime(): Promise<number | null> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(['lastSyncTime'], (result) => {
      const err = checkRuntimeError();
      if (err) { reject(err); return; }
      resolve(result.lastSyncTime || null);
    });
  });
}
function formatDateTime(ts: number | null): string {
  if (!ts) return '---';
  const d = new Date(ts);
  return formatDateToString(d);
}

// HTML特殊文字をエスケープしてXSSを防ぐ
function escapeHtml(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Create sync modal
export function createSyncModal(): HTMLElement {
  const modal = document.createElement('div');
  modal.className = 'cs-sync-modal';
  // Static template - dynamic user content is escaped via escapeHtml() in loadGoogleAccounts()
  modal.innerHTML = [ // eslint-disable-line
    '<div class="cs-sync-modal-content">',
      '<div class="cs-sync-header">',
        '<h3>Googleカレンダー同期</h3>',
        '<button class="cs-sync-close">&times;</button>',
      '</div>',
      '<div class="cs-sync-body">',
        '<div class="cs-sync-account-section">',
          '<h4>アカウント選択</h4>',
          '<div class="cs-sync-accounts" id="syncAccounts">',
            '<div class="cs-sync-loading">アカウント情報を取得中...</div>',
          '</div>',
        '</div>',
        '<div class="cs-sync-options">',
          '<label><input type="checkbox" id="syncAssignments" checked> 課題を同期</label>',
          '<label><input type="checkbox" id="syncQuizzes" checked> クイズを同期</label>',
        '</div>',
        '<div class="cs-sync-auto-settings">',
          '<label class="cs-auto-sync-toggle">',
            '<input type="checkbox" id="autoSyncEnabled" checked>',
            '<span class="cs-toggle-slider"></span>',
            '自動同期を有効にする',
          '</label>',
          '<div class="cs-sync-interval-settings" id="syncIntervalSettings">',
            '<label>同期間隔(分): <input type="number" id="syncIntervalInput" min="240" max="1440" value="240"> </label>',
          '</div>',
        '</div>',
        '<div class="cs-sync-settings">',
          '<span id="lastSyncTimeLabel">最終同期: ---</span>',
          '<button id="refreshLastSyncBtn" class="cs-sync-btn cs-sync-btn-secondary">再取得</button>',
        '</div>',
        '<div class="cs-sync-status" id="syncStatus"></div>',
      '</div>',
      '<div class="cs-sync-footer">',
        '<button class="cs-sync-btn cs-sync-btn-danger" id="clearSentBtn">履歴クリア</button>',
        '<button class="cs-sync-btn cs-sync-btn-primary" id="syncButton">同期開始</button>',
      '</div>',
    '</div>',
  ].join('');

  // Close modal
  const closeBtn = modal.querySelector('.cs-sync-close');
  closeBtn?.addEventListener('click', () => {
    modal.remove();
  });

  // Click outside to close
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });

  return modal;
}

// Load Google accounts into modal
async function loadGoogleAccounts(modal: HTMLElement) {
  const accountsContainer = modal.querySelector('#syncAccounts');
  const connectedContainerId = 'cs-connected-account';
  let connectedContainer = modal.querySelector(`#${connectedContainerId}`) as HTMLElement;
  if (!accountsContainer) return;

  try {
    // Show loading state
    accountsContainer.innerHTML = '<div class="cs-sync-loading">アカウント情報を取得中...</div>';

    const accounts = await getGoogleAccounts();

    // 接続中アカウント表示エリアを作成・更新
    if (!connectedContainer) {
      connectedContainer = document.createElement('div');
      connectedContainer.id = connectedContainerId;
      connectedContainer.className = 'cs-connected-account-section';
      accountsContainer.parentElement?.insertBefore(connectedContainer, accountsContainer);
    }

    // 自動同期トグルを認証状態に連動させる
    const autoSyncCheckbox = modal.querySelector('#autoSyncEnabled') as HTMLInputElement | null;
    const syncIntervalSettings = modal.querySelector('#syncIntervalSettings') as HTMLElement | null;
    const syncIntervalInput = modal.querySelector('#syncIntervalInput') as HTMLInputElement | null;

    if (accounts && accounts.length > 0) {
      // 認証済み: トグル操作を許可
      if (autoSyncCheckbox) {
        autoSyncCheckbox.disabled = false;
      }
      // User is authenticated - show account info
      const account = accounts[0];
      // account フィールドをエスケープして XSS を防ぐ (M1)
      const rawPicture = escapeHtml(account.picture);
      const safePicture = rawPicture.startsWith('https://') ? rawPicture : '';
      const safeName = escapeHtml(account.name);
      const safeEmail = escapeHtml(account.email);
      connectedContainer.innerHTML = `
        <div class="cs-connected-account">
          <img src="${safePicture}" alt="${safeName}" class="cs-sync-account-picture">
          <div class="cs-sync-account-info">
            <div class="cs-sync-account-name">${safeName}</div>
            <div class="cs-sync-account-email">${safeEmail}</div>
          </div>
          <span class="cs-connected-label">認証済み</span>
          <button class="cs-sync-btn cs-sync-btn-secondary" id="logoutButton" title="ログアウト">
            ログアウト
          </button>
        </div>
      `;

      // Clear accounts selection area since user is already authenticated
      accountsContainer.innerHTML = '';

      // ログアウトボタンのイベントハンドラを追加（連打ガード付き: H2）
      const logoutBtn = connectedContainer.querySelector('#logoutButton') as HTMLButtonElement | null;
      logoutBtn?.addEventListener('click', async () => {
        // ユーザーに確認を求める
        const confirmed = confirm('🔐 完全ログアウトを実行しますか？\n\n・すべての認証情報が削除されます\n・同期履歴もクリアされます\n・再度同期するには再認証が必要になります');

        if (!confirmed) {
          return;
        }

        logoutBtn.disabled = true;
        try {
          showSyncStatus(modal, '🔐 完全ログアウト実行中...', 'info');
          logger.debug('🔧 [UI DEBUG] Starting complete logout process...');

          await logoutGoogle();

          logger.debug('🔧 [UI DEBUG] Logout completed, reloading accounts...');
          // ログアウト後にアカウント情報を再取得
          await loadGoogleAccounts(modal);

          showSyncStatus(modal, '✅ 完全ログアウトが完了しました。再認証が必要です。', 'success');
          logger.debug('🔧 [UI DEBUG] Complete logout process finished');
        } catch (error: any) {
          logger.error('🔧 [UI DEBUG] Logout failed:', error);
          showSyncStatus(modal, `❌ ログアウトに失敗しました: ${error.message}`, 'error');
          logoutBtn.disabled = false;
        }
      });
    } else {
      // 未認証: 自動同期を強制OFFにしてトグルを無効化
      if (autoSyncCheckbox) {
        autoSyncCheckbox.checked = false;
        autoSyncCheckbox.disabled = true;
        setAutoSyncEnabled(false);
      }
      if (syncIntervalSettings) {
        syncIntervalSettings.style.opacity = '0.5';
        if (syncIntervalInput) syncIntervalInput.disabled = true;
      }

      // User is not authenticated - show login interface
      connectedContainer.innerHTML = '';
      accountsContainer.innerHTML = `
        <div class="cs-sync-no-account">
          <div class="cs-auth-notice">
            <h4>🔐 Googleアカウントでの認証が必要です</h4>
            <p>カレンダー同期を使用するには、Googleアカウントでログインしてください。</p>
            <p><small>※ あなたの同意なしにアカウント情報が取得されることはありません</small></p>
          </div>
          <button class="cs-sync-btn cs-sync-btn-primary" id="loginButton">
            <span>🔑</span> Googleでログイン
          </button>
        </div>
      `;

      // ログインボタンに連打ガードを追加（H2）
      const loginBtn = accountsContainer.querySelector('#loginButton') as HTMLButtonElement | null;
      loginBtn?.addEventListener('click', async () => {
        const btn = loginBtn as HTMLButtonElement;
        btn.disabled = true;
        try {
          showSyncStatus(modal, 'Googleアカウントでログイン中...', 'info');
          await authenticateGoogle();
          // 認証後に再取得
          await loadGoogleAccounts(modal);
          showSyncStatus(modal, 'ログインが完了しました', 'success');
        } catch (error: any) {
          showSyncStatus(modal, `ログインに失敗しました: ${error.message}`, 'error');
          btn.disabled = false;
        }
      });
    }
  } catch (error: any) {
    // エラー詳細をUIに表示（error.message をエスケープして XSS を防ぐ: M2）
    const safeErrorMessage = escapeHtml(error.message || String(error));
    accountsContainer.innerHTML = `
      <div class="cs-sync-error">
        <h4>⚠️ エラーが発生しました</h4>
        <p>アカウント情報の取得に失敗しました: ${safeErrorMessage}</p>
        <button class="cs-sync-btn cs-sync-btn-primary" id="retryButton">
          再試行
        </button>
      </div>
    `;
    if (connectedContainer) connectedContainer.innerHTML = '';

    // Add retry button handler
    const retryBtn = accountsContainer.querySelector('#retryButton');
    retryBtn?.addEventListener('click', () => loadGoogleAccounts(modal));
  }
}

// Show sync status
function showSyncStatus(modal: HTMLElement, message: string, type: 'info' | 'success' | 'error' = 'info') {
  const statusContainer = modal.querySelector('#syncStatus');
  if (!statusContainer) return;

  statusContainer.className = `cs-sync-status cs-sync-status-${type}`;
  statusContainer.textContent = message;
}

// Perform sync
async function performSync(modal: HTMLElement, forceSync: boolean = false) {
  const syncButton = modal.querySelector('#syncButton') as HTMLButtonElement;
  const syncAssignments = (modal.querySelector('#syncAssignments') as HTMLInputElement)?.checked;
  const syncQuizzes = (modal.querySelector('#syncQuizzes') as HTMLInputElement)?.checked;

  if (!syncAssignments && !syncQuizzes) {
    showSyncStatus(modal, '同期する項目を選択してください', 'error');
    return;
  }

  // Disable buttons during sync
  if (syncButton) syncButton.disabled = true;

  try {
    showSyncStatus(modal, '認証状態を確認中...', 'info');

    // Check if user is authenticated before attempting sync
    const accounts = await getGoogleAccounts();
    if (accounts.length === 0) {
      showSyncStatus(modal, '⚠️ Googleアカウントでの認証が必要です。「Googleでログイン」ボタンをクリックしてください。', 'error');
      return;
    }

    // Google認証トークンを取得
    let token: string | undefined;
    try {
      token = await authenticateGoogle();
      logger.debug('Token acquired for syncToCalendar');
    } catch (e) {
      showSyncStatus(modal, 'Google認証トークンの取得に失敗しました', 'error');
      return;
    }

    showSyncStatus(modal, '同期を開始しています...', 'info');

    // Get current site data
    const hostname = window.location.hostname;
    const courses = fetchCourse();
    let assignments: any[] = [];
    let quizzes: any[] = [];

    if (syncAssignments) {
      try {
        assignments = await getAssignments(hostname, courses, false);
        const allEntries = assignments.flatMap(assignment => assignment.entries);
        showSyncStatus(modal, `課題データを取得しました (${allEntries.length}件)`, 'info');
      } catch (error) {
        logger.error('Failed to get assignments:', error);
      }
    }

    if (syncQuizzes) {
      try {
        quizzes = await getQuizzes(hostname, courses, false);
        const allEntries = quizzes.flatMap(quiz => quiz.entries);
        showSyncStatus(modal, `クイズデータを取得しました (${allEntries.length}件)`, 'info');
      } catch (error) {
        logger.error('Failed to get quizzes:', error);
      }
    }

    // 現在時刻取得
    const now = Math.floor(Date.now() / 1000);
    // 締切が今より前のものは除外し、コース情報を付与
    const totalAssignmentEntries = assignments.flatMap(assignment =>
      assignment.entries
        .filter((e: any) => (e.dueTime || e.dueDate) > now)
        .map((e: any) => ({ ...e, courseName: assignment.course?.name || '', context: assignment.course?.id || '' }))
    );
    const totalQuizEntries = quizzes.flatMap(quiz =>
      quiz.entries
        .filter((e: any) => (e.dueTime || e.dueDate) > now)
        .map((e: any) => ({ ...e, courseName: quiz.course?.name || '', context: quiz.course?.id || '' }))
    );
    if (totalAssignmentEntries.length === 0 && totalQuizEntries.length === 0) {
      showSyncStatus(modal, '同期するデータが見つかりませんでした（未来の締切のある課題・クイズがありません）', 'error');
      return;
    }

    // Perform calendar sync
    showSyncStatus(modal, 'Googleカレンダーに同期中...', 'info');

    const result = await syncToCalendar(totalAssignmentEntries, totalQuizEntries, token);

    // Show results
    const totalSuccess = result.assignments.length + result.quizzes.length;

    // 実際にイベントが作成された場合のみ最終同期時刻を保存
    if (totalSuccess > 0) {
      await setLastSyncTime(Date.now());
      const lastSyncTimeLabel = modal.querySelector('#lastSyncTimeLabel') as HTMLElement;
      if (lastSyncTimeLabel) lastSyncTimeLabel.textContent = '最終同期: ' + formatDateTime(Date.now());
    }
    const totalErrors = result.errors.length;
    if (totalErrors === 0) {
      showSyncStatus(modal, `✅ 同期完了: ${totalSuccess}件のイベントが作成されました`, 'success');
    } else {
      showSyncStatus(modal, `⚠️ 同期完了: ${totalSuccess}件成功, ${totalErrors}件失敗`, 'error');
      logger.debug('Sync errors:', result.errors);
    }

  } catch (error) {
    logger.error('Sync error:', error);
    showSyncStatus(modal, `❌ 同期に失敗しました: ${error instanceof Error ? error.message : String(error)}`, 'error');
  } finally {
    // Re-enable buttons
    if (syncButton) syncButton.disabled = false;
  }
}

// Show sync modal
export function showSyncModal() {
  // Remove existing modal if any
  const existingModal = document.querySelector('.cs-sync-modal');
  if (existingModal) {
    existingModal.remove();
  }

  const modal = createSyncModal();
  document.body.appendChild(modal);

  // Load Google accounts
  loadGoogleAccounts(modal);
  // 設定値・最終同期時刻の反映
  const syncIntervalInput = modal.querySelector('#syncIntervalInput') as HTMLInputElement;
  const autoSyncCheckbox = modal.querySelector('#autoSyncEnabled') as HTMLInputElement;
  const syncIntervalSettings = modal.querySelector('#syncIntervalSettings') as HTMLElement;
  const lastSyncTimeLabel = modal.querySelector('#lastSyncTimeLabel') as HTMLElement;

  getSyncInterval().then(val => { syncIntervalInput.value = String(val); });
  getAutoSyncEnabled().then(enabled => {
    autoSyncCheckbox.checked = enabled;
    // 自動同期が無効の場合は間隔設定を無効化
    if (syncIntervalSettings) {
      syncIntervalSettings.style.opacity = enabled ? '1' : '0.5';
      syncIntervalInput.disabled = !enabled;
    }
  });
  getLastSyncTime().then(ts => {
    lastSyncTimeLabel.textContent = '最終同期: ' + formatDateTime(ts);
  });

  // 自動同期切り替えのイベントハンドラー
  autoSyncCheckbox?.addEventListener('change', async () => {
    const enabled = autoSyncCheckbox.checked;
    await setAutoSyncEnabled(enabled);

    // 間隔設定の有効/無効化
    if (syncIntervalSettings) {
      syncIntervalSettings.style.opacity = enabled ? '1' : '0.5';
      syncIntervalInput.disabled = !enabled;
    }

    // バックグラウンドスクリプトのアラームも更新
    try {
      await sendMessage('updateSyncInterval');
      logger.debug(`自動同期を${enabled ? '有効' : '無効'}にしました`);
      showSyncStatus(modal, `自動同期を${enabled ? '有効' : '無効'}にしました`, 'success');
    } catch (error) {
      logger.error('自動同期設定の更新に失敗:', error);
    }
  });

  // 同期間隔変更のイベントハンドラー
  syncIntervalInput?.addEventListener('change', async () => {
    const v = Math.max(240, Math.min(1440, Number(syncIntervalInput.value)));
    await setSyncInterval(v);
    syncIntervalInput.value = String(v);
    // バックグラウンドスクリプトのアラームも更新
    try {
      await sendMessage('updateSyncInterval');
      logger.debug(`同期間隔を更新しました: ${v}分`);
    } catch (error) {
      logger.error('同期間隔の更新に失敗:', error);
    }
  });
  // 送信済み履歴クリアボタン
  const clearBtn = modal.querySelector('#clearSentBtn');
  clearBtn?.addEventListener('click', async () => {
    const confirmed = confirm('ローカルの送信済み履歴をクリアしますか？\n\nカレンダー側での重複チェックがあるため、通常は重複作成されません。\nカレンダーAPI接続に失敗した場合のみ重複の可能性があります。');
    if (!confirmed) return;
    await clearSentEventKeys();
    showSyncStatus(modal, '送信済み履歴をクリアしました', 'success');
  });
  // 再取得ボタンのイベント
  const refreshBtn = modal.querySelector('#refreshLastSyncBtn');
  refreshBtn?.addEventListener('click', async () => {
    const ts = await getLastSyncTime();
    lastSyncTimeLabel.textContent = '最終同期: ' + formatDateTime(ts);
  });

  // ストレージ変更監視（C2: 名前付き関数で保持し、モーダル削除時に必ず removeListener する）
  const storageHandler = (changes: { [key: string]: chrome.storage.StorageChange }, area: string) => {
    if (area === 'local' && changes.lastSyncTime && document.body.contains(modal)) {
      lastSyncTimeLabel.textContent = '最終同期: ' + formatDateTime(changes.lastSyncTime.newValue);
    }
  };
  chrome.storage.onChanged.addListener(storageHandler);

  const closeModal = () => {
    chrome.storage.onChanged.removeListener(storageHandler);
    modal.remove();
  };

  // createSyncModal() 内の閉じる処理を上書きして removeListener を確実に呼ぶ
  const closeBtn = modal.querySelector('.cs-sync-close');
  closeBtn?.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal();
    }
  });

  // Setup sync button handlers
  const syncButton = modal.querySelector('#syncButton');

  syncButton?.addEventListener('click', () => performSync(modal, false));
}
