/**
 * Google Calendarとの同期機能を提供
 * 課題とクイズの情報をGoogle Calendarに同期する
 */
// Google Calendar sync functionality
import { getAssignments } from './features/entity/assignment/getAssignment';
import { getQuizzes } from './features/entity/quiz/getQuiz';
import { fetchCourse } from './features/api/fetch';
import type { GoogleAccount, SyncResult, ChromeMessage, ChromeResponse } from '../types/calendar-sync';

// Send message to background script
function sendMessage(action: string, data?: any): Promise<ChromeResponse> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ action, ...data } as ChromeMessage, (response: ChromeResponse) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
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
    return response.accounts || [];
  } catch (error) {
    console.error('Failed to get Google accounts:', error);
    return [];
  }
}

// Authenticate with Google
export async function authenticateGoogle(): Promise<string> {
  const response = await sendMessage('authenticateGoogle');
  if (!response.token) {
    throw new Error('No authentication token received');
  }
  return response.token;
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

// 追加: ストレージ操作用ユーティリティ
function clearSentEventKeys() {
  return new Promise<void>((resolve) => {
    chrome.storage.local.remove('sentEventKeys', () => resolve());
  });
}
function setSyncInterval(minutes: number) {
  chrome.storage.local.set({ calendarSyncInterval: minutes });
}
function getSyncInterval(): Promise<number> {
  return new Promise((resolve) => {
    chrome.storage.local.get(['calendarSyncInterval'], (result) => {
      resolve(result.calendarSyncInterval || 240); // デフォルト240分
    });
  });
}
function setAutoSyncEnabled(enabled: boolean) {
  chrome.storage.local.set({ autoSyncEnabled: enabled });
}
function getAutoSyncEnabled(): Promise<boolean> {
  return new Promise((resolve) => {
    chrome.storage.local.get(['autoSyncEnabled'], (result) => {
      resolve(result.autoSyncEnabled !== false); // デフォルトはtrue
    });
  });
}
function setLastSyncTime(time: number) {
  chrome.storage.local.set({ lastSyncTime: time });
}
function getLastSyncTime(): Promise<number | null> {
  return new Promise((resolve) => {
    chrome.storage.local.get(['lastSyncTime'], (result) => {
      resolve(result.lastSyncTime || null);
    });
  });
}
function formatDateTime(ts: number | null): string {
  if (!ts) return '---';
  const d = new Date(ts);
  return d.toLocaleString();
}

// Create sync modal
export function createSyncModal(): HTMLElement {
  const modal = document.createElement('div');
  modal.className = 'cs-sync-modal';
  modal.innerHTML = `
    <div class="cs-sync-modal-content">
      <div class="cs-sync-header">
        <h3>Googleカレンダー同期</h3>
        <button class="cs-sync-close">&times;</button>
      </div>
      <div class="cs-sync-body">
        <div class="cs-sync-account-section">
          <h4>アカウント選択</h4>
          <div class="cs-sync-accounts" id="syncAccounts">
            <div class="cs-sync-loading">アカウント情報を取得中...</div>
          </div>
        </div>
        <div class="cs-sync-options">
          <label>
            <input type="checkbox" id="syncAssignments" checked>
            課題を同期
          </label>
          <label>
            <input type="checkbox" id="syncQuizzes" checked>
            クイズを同期
          </label>
        </div>
        <div class="cs-sync-auto-settings">
          <label class="cs-auto-sync-toggle">
            <input type="checkbox" id="autoSyncEnabled" checked>
            <span class="cs-toggle-slider"></span>
            自動同期を有効にする
          </label>
          <div class="cs-sync-interval-settings" id="syncIntervalSettings">
            <label>同期間隔(分): <input type="number" id="syncIntervalInput" min="240" max="1440" value="240" style="width:60px;"> </label>
          </div>
        </div>
        <div class="cs-sync-settings">
          <span id="lastSyncTimeLabel">最終同期: ---</span>
          <button id="refreshLastSyncBtn" class="cs-sync-btn cs-sync-btn-secondary" style="margin-left:8px;">再取得</button>
        </div>
        <div class="cs-sync-actions">
          <button class="cs-sync-btn cs-sync-btn-primary" id="syncButton">
            同期開始
          </button>
          <button class="cs-sync-btn cs-sync-btn-danger" id="clearSentBtn">
            送信済み履歴クリア
          </button>
        </div>
        <div class="cs-sync-status" id="syncStatus"></div>
      </div>
    </div>
  `;

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
    const accounts = await getGoogleAccounts();
    // 接続中アカウント表示エリアを作成・更新
    if (!connectedContainer) {
      connectedContainer = document.createElement('div');
      connectedContainer.id = connectedContainerId;
      connectedContainer.className = 'cs-connected-account-section';
      accountsContainer.parentElement?.insertBefore(connectedContainer, accountsContainer);
    }
    if (accounts && accounts.length > 0) {
      const account = accounts[0];
      connectedContainer.innerHTML = `
        <div class="cs-connected-account">
          <img src="${account.picture}" alt="${account.name}" class="cs-sync-account-picture">
          <div class="cs-sync-account-info">
            <div class="cs-sync-account-name">${account.name}</div>
            <div class="cs-sync-account-email">${account.email}</div>
          </div>
          <span class="cs-connected-label">接続中</span>
        </div>
      `;
    } else {
      connectedContainer.innerHTML = '';
    }
    // accounts配列が空でなければ必ずUIを描画
    if (accounts && accounts.length > 0) {
      accountsContainer.innerHTML = accounts.map(account => `
        <div class="cs-sync-account" data-account-id="${account.id}">
          <img src="${account.picture}" alt="${account.name}" class="cs-sync-account-picture">
          <div class="cs-sync-account-info">
            <div class="cs-sync-account-name">${account.name}</div>
            <div class="cs-sync-account-email">${account.email}</div>
          </div>
          <input type="radio" name="selectedAccount" value="${account.id}" ${accounts.length === 1 ? 'checked' : ''}>
        </div>
      `).join('');
    } else {
      accountsContainer.innerHTML = `
        <div class="cs-sync-no-account">
          <p>Googleアカウントが見つかりません</p>
          <button class="cs-sync-btn cs-sync-btn-primary" id="loginButton">
            Googleでログイン
          </button>
        </div>
      `;
      const loginBtn = accountsContainer.querySelector('#loginButton');
      loginBtn?.addEventListener('click', async () => {
        try {
          await authenticateGoogle();
          // 認証後に再取得
          await loadGoogleAccounts(modal);
        } catch (error: any) {
          showSyncStatus(modal, `ログインに失敗しました: ${error.message}`, 'error');
        }
      });
    }
  } catch (error: any) {
    // エラー詳細をUIに表示
    accountsContainer.innerHTML = `
      <div class="cs-sync-error">
        アカウント情報の取得に失敗しました: ${error.message || error}
      </div>
    `;
    if (connectedContainer) connectedContainer.innerHTML = '';
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
    showSyncStatus(modal, '同期を開始しています...', 'info');

    // Get current site data
    const hostname = window.location.hostname;
    let assignments: any[] = [];
    let quizzes: any[] = [];

    if (syncAssignments) {
      try {
        const courses = fetchCourse();
        assignments = await getAssignments(hostname, courses, false);
        const allEntries = assignments.flatMap(assignment => assignment.entries);
        showSyncStatus(modal, `課題データを取得しました (${allEntries.length}件)`, 'info');
      } catch (error) {
        console.error('Failed to get assignments:', error);
      }
    }

    if (syncQuizzes) {
      try {
        const courses = fetchCourse();
        quizzes = await getQuizzes(hostname, courses, false);
        const allEntries = quizzes.flatMap(quiz => quiz.entries);
        showSyncStatus(modal, `クイズデータを取得しました (${allEntries.length}件)`, 'info');
      } catch (error) {
        console.error('Failed to get quizzes:', error);
      }
    }

    // 現在時刻取得
    const now = Math.floor(Date.now() / 1000);
    // 締切が今より前のものは除外
    const totalAssignmentEntries = assignments.flatMap(assignment => assignment.entries).filter(e => (e.dueTime || e.dueDate) > now);
    const totalQuizEntries = quizzes.flatMap(quiz => quiz.entries).filter(e => (e.dueTime || e.dueDate) > now);
    if (totalAssignmentEntries.length === 0 && totalQuizEntries.length === 0) {
      showSyncStatus(modal, '同期するデータが見つかりませんでした', 'error');
      return;
    }

    // Perform calendar sync
    showSyncStatus(modal, 'Googleカレンダーに同期中...', 'info');
    const result = await syncToCalendar(totalAssignmentEntries, totalQuizEntries);
    // 最終同期時刻保存
    setLastSyncTime(Date.now());
    const lastSyncTimeLabel = modal.querySelector('#lastSyncTimeLabel') as HTMLElement;
    if (lastSyncTimeLabel) lastSyncTimeLabel.textContent = '最終同期: ' + formatDateTime(Date.now());

    // Show results
    const totalSuccess = result.assignments.length + result.quizzes.length;
    const totalErrors = result.errors.length;
    if (totalErrors === 0) {
      showSyncStatus(modal, `同期完了: ${totalSuccess}件のイベントが作成されました`, 'success');
    } else {
      showSyncStatus(modal, `同期完了: ${totalSuccess}件成功, ${totalErrors}件失敗`, 'error');
    }

  } catch (error) {
    showSyncStatus(modal, `同期に失敗しました: ${error instanceof Error ? error.message : String(error)}`, 'error');
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
      console.log(`自動同期を${enabled ? '有効' : '無効'}にしました`);
      showSyncStatus(modal, `自動同期を${enabled ? '有効' : '無効'}にしました`, 'success');
    } catch (error) {
      console.error('自動同期設定の更新に失敗:', error);
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
      console.log(`同期間隔を更新しました: ${v}分`);
    } catch (error) {
      console.error('同期間隔の更新に失敗:', error);
    }
  });
  // 送信済み履歴クリアボタン
  const clearBtn = modal.querySelector('#clearSentBtn');
  clearBtn?.addEventListener('click', async () => {
    await clearSentEventKeys();
    showSyncStatus(modal, '送信済み履歴をクリアしました', 'success');
  });
  // 再取得ボタンのイベント
  const refreshBtn = modal.querySelector('#refreshLastSyncBtn');
  refreshBtn?.addEventListener('click', async () => {
    const ts = await getLastSyncTime();
    lastSyncTimeLabel.textContent = '最終同期: ' + formatDateTime(ts);
  });
  // ストレージ変更監視（モーダルが開いている間のみ）
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.lastSyncTime && document.body.contains(modal)) {
      lastSyncTimeLabel.textContent = '最終同期: ' + formatDateTime(changes.lastSyncTime.newValue);
      
      // 同期開始ボタンの状態を更新
      if (syncButton) {
        (syncButton as HTMLButtonElement).disabled = changes.lastSyncTime.newValue !== null;
      }
    }
  });
  // Setup sync button handlers
  const syncButton = modal.querySelector('#syncButton');

  // 同期開始ボタンの制御：最終同期時刻がnullの場合のみ有効
  getLastSyncTime().then(lastSyncTime => {
    if (syncButton) {
      (syncButton as HTMLButtonElement).disabled = lastSyncTime !== null;
    }
  });

  syncButton?.addEventListener('click', () => performSync(modal, false));
}
