/**
 * -----------------------------------------------------------------
 * Modified by: roz
 * Date       : 2025-05-28
 * Changes    : カレンダー同期機能とGoogle OAuth認証システムの実装
 * Category   : バックグラウンド処理
 * -----------------------------------------------------------------
 */
// For debugging

// カレンダー同期用のアラーム名 
const CALENDAR_SYNC_ALARM_NAME = 'calendarSyncAlarm';

// 通知を表示する関数
function showNotification(title: string, message: string) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: '/img/icon128.png',
    title: title,
    message: message,
    priority: 1
  });
}

// 初期化処理
function init() {
  console.log('Service Worker初期化');
  // アラームの設定
  setupCalendarSyncAlarm();
}

// カレンダー同期用のアラームをセットアップ
async function setupCalendarSyncAlarm() {
  return new Promise<void>((resolve) => {
    chrome.storage.local.get(['calendarSyncInterval', 'autoSyncEnabled'], (result) => {
      const autoSyncEnabled = result.autoSyncEnabled !== false; // デフォルトはtrue
      
      // 既存のアラームをクリア
      chrome.alarms.clear(CALENDAR_SYNC_ALARM_NAME, () => {
        if (autoSyncEnabled) {
          // 自動同期が有効な場合のみアラームを作成
          const interval = result.calendarSyncInterval || 60; // デフォルト60分
          chrome.alarms.create(CALENDAR_SYNC_ALARM_NAME, {
            periodInMinutes: interval
          });
          console.log(`カレンダー同期アラームをセット: ${interval}分間隔`);
        } else {
          console.log('自動同期が無効のため、アラームをクリアしました');
        }
        resolve();
      });
    });
  });
}

// 同期間隔を取得（分単位）
async function getSyncInterval(): Promise<number> {
  return new Promise((resolve) => {
    chrome.storage.local.get(['calendarSyncInterval'], (result) => {
      // デフォルト60分
      resolve(result.calendarSyncInterval || 60);
    });
  });
}

// Google Calendar sync background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  (async () => {
    try {
      switch (request.action) {
        case 'authenticateGoogle': {
          const token = await authenticateGoogle();
          sendResponse({ success: true, token });
          break;
        }
        case 'syncToCalendar': {
          const result = await syncToCalendar(request.data, request.token);
          sendResponse({ success: true, result });
          break;
        }
        case 'getGoogleAccounts': {
          const accounts = await getGoogleAccounts();
          sendResponse({ success: true, accounts });
          break;
        }
        case 'logout': {
          await logoutGoogle();
          sendResponse({ success: true });
          break;
        }
        case 'checkAutoSync': {
          // 自動同期の条件を確認
          const shouldSync = await shouldAutoSync();
          sendResponse({ success: true, shouldSync });
          break;
        }
        case 'updateSyncInterval': {
          // 同期間隔が変更されたらアラームも更新
          await setupCalendarSyncAlarm();
          sendResponse({ success: true });
          break;
        }
        case 'setAutoSyncEnabled': {
          // 自動同期の有効/無効設定
          const enabled = request.enabled;
          chrome.storage.local.set({ autoSyncEnabled: enabled });
          await setupCalendarSyncAlarm(); // アラームを更新
          sendResponse({ success: true });
          break;
        }
        default:
          sendResponse({ success: false, error: 'Unknown action' });
      }
    } catch (error: any) {
      console.error('Background script error:', error);
      sendResponse({ success: false, error: error?.message || String(error) });
    }
  })();
  return true; // async response
});

// アラームイベントのリスナー
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === CALENDAR_SYNC_ALARM_NAME) {
    console.log('カレンダー同期アラームが発火しました');
    await performCalendarSync();
  }
});

// 最後の同期から設定間隔以上経過しているかチェック
async function shouldAutoSync(): Promise<boolean> {
  return new Promise((resolve) => {
    chrome.storage.local.get(['lastSyncTime', 'calendarSyncInterval', 'autoSyncEnabled'], (result) => {
      // 自動同期が無効化されている場合は同期しない
      const autoSyncEnabled = result.autoSyncEnabled !== false; // デフォルトはtrue
      if (!autoSyncEnabled) {
        resolve(false);
        return;
      }

      const lastSyncTime = result.lastSyncTime || 0;
      // デフォルト60分、ミリ秒に変換
      const interval = (result.calendarSyncInterval || 60) * 60 * 1000;
      const now = Date.now();
      
      // 最終同期時間 + 同期間隔 < 現在時刻 なら同期が必要
      const needsSync = lastSyncTime + interval < now;
      resolve(needsSync);
    });
  });
}

// Google OAuth authentication
async function authenticateGoogle(): Promise<string> {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive: true }, (token) => {
      if (chrome.runtime.lastError || !token) {
        reject(new Error(chrome.runtime.lastError?.message || 'No token'));
      } else {
        resolve(token);
      }
    });
  });
}

// Get user's Google accounts
async function getGoogleAccounts(): Promise<any[]> {
  return new Promise((resolve) => {
    chrome.identity.getAuthToken({ interactive: false }, async (token) => {
      const tryFetchUserInfo = async (tokenToUse: string, on401: () => void) => {
        try {
          const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { 'Authorization': `Bearer ${tokenToUse}` }
          });
          
          if (response.ok) {
            const userInfo = await response.json();
            resolve([
              {
                id: userInfo.id,
                email: userInfo.email,
                name: userInfo.name,
                picture: userInfo.picture
              }
            ]);
          } else if (response.status === 401) {
            chrome.identity.removeCachedAuthToken({ token: tokenToUse }, on401);
          } else {
            resolve([]);
          }
        } catch (e) {
          resolve([]);
        }
      };
      
      if (!token) {
        chrome.identity.getAuthToken({ interactive: true }, (token2) => {
          if (!token2) return resolve([]);
          tryFetchUserInfo(token2, () => resolve([]));
        });
        return;
      }
      
      await tryFetchUserInfo(token, () => {
        chrome.identity.getAuthToken({ interactive: true }, (token3) => {
          if (!token3) return resolve([]);
          tryFetchUserInfo(token3, () => resolve([]));
        });
      });
    });
  });
}

// 送信済みイベント管理
async function getSentEventKeys(): Promise<Set<string>> {
  return new Promise((resolve) => {
    chrome.storage.local.get(['sentEventKeys'], (result) => {
      resolve(new Set(result.sentEventKeys || []));
    });
  });
}
async function addSentEventKey(key: string) {
  const keys = await getSentEventKeys();
  keys.add(key);
  chrome.storage.local.set({ sentEventKeys: Array.from(keys) });
}
function makeEventKey(item: any, type: string): string {
  // id+type+title+course名で一意化
  return `${type}:${item.id || ''}:${item.title || ''}:${item.context || item.courseName || ''}`;
}

// Sync assignments and quizzes to Google Calendar
async function syncToCalendar(data: any, token?: string): Promise<any> {
  if (!token) {
    token = await authenticateGoogle();
  }
  const results = { assignments: [], quizzes: [], errors: [] } as any;
  const sentKeys = await getSentEventKeys();
  const now = Math.floor(Date.now() / 1000);
  // Sync assignments
  if (data.assignments && data.assignments.length > 0) {
    for (let i = 0; i < data.assignments.length; i++) {
      const assignment = data.assignments[i];
      const due = assignment.dueTime || assignment.dueDate;
      if (!due || due <= now) continue; // 過去はスキップ
      const key = makeEventKey(assignment, 'assignment');
      if (sentKeys.has(key)) continue;
      try {
        const event = await createCalendarEvent(assignment, 'assignment', token!);
        results.assignments.push({ title: assignment.title, success: true, eventId: event.id });
        await addSentEventKey(key);
      } catch (error: any) {
        results.errors.push({ type: 'assignment', title: assignment.title, error: error.message });
      }
    }
  }
  // Sync quizzes
  if (data.quizzes && data.quizzes.length > 0) {
    for (let i = 0; i < data.quizzes.length; i++) {
      const quiz = data.quizzes[i];
      const due = quiz.dueTime || quiz.dueDate;
      if (!due || due <= now) continue; // 過去はスキップ
      const key = makeEventKey(quiz, 'quiz');
      if (sentKeys.has(key)) continue;
      try {
        const event = await createCalendarEvent(quiz, 'quiz', token!);
        results.quizzes.push({ title: quiz.title, success: true, eventId: event.id });
        await addSentEventKey(key);
      } catch (error: any) {
        results.errors.push({ type: 'quiz', title: quiz.title, error: error.message });
      }
    }
  }
  return results;
}

// Create a calendar event
async function createCalendarEvent(item: any, type: string, token: string): Promise<any> {
  const dueDate = item.dueTime || item.dueDate;
  if (!dueDate) {
    throw new Error('No due date available');
  }
  const dueDateMs = typeof dueDate === 'number' ? dueDate * 1000 : dueDate;
  const startTime = new Date(dueDateMs);
  const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // 1 hour
  if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
    throw new Error(`Invalid date: ${dueDate}`);
  }
  // コース名取得
  const courseName = item.context || item.courseName || item.course || '';
  const summary = type === 'assignment' ? `課題: ${item.title}` : `小テスト: ${item.title}`;
  const event = {
    summary,
    description: '', // 詳細は不要
    start: { 
      dateTime: startTime.toISOString(), 
      timeZone: 'Asia/Tokyo' 
    },
    end: { 
      dateTime: endTime.toISOString(), 
      timeZone: 'Asia/Tokyo' 
    },
    location: courseName,
    reminders: { 
      useDefault: false, 
      overrides: [ 
        { method: 'popup', minutes: 60 }, 
        { method: 'popup', minutes: 1440 } 
      ] 
    }
  };
  const requestBody = JSON.stringify(event);
  try {
    const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`, 
        'Content-Type': 'application/json' 
      },
      body: requestBody
    });
    let responseBody = '';
    try { 
      responseBody = await response.text(); 
    } catch (readError) {
      throw new Error('Failed to read response from Calendar API');
    }
    if (!response.ok) {
      let errorData: any = {};
      try { 
        errorData = JSON.parse(responseBody); 
      } catch (parseError) {
        throw new Error(`Calendar API HTTP ${response.status}: ${responseBody}`);
      }
      const errMsg = (errorData && errorData.error && errorData.error.message) ? errorData.error.message : 'Unknown error';
      throw new Error(`Calendar API error (${response.status}): ${errMsg}`);
    }
    let responseJson: any;
    try {
      responseJson = JSON.parse(responseBody);
    } catch (parseError) {
      throw new Error('Failed to parse Calendar API response');
    }
    return responseJson;
  } catch (fetchError) {
    const errorMessage = fetchError instanceof Error ? fetchError.message : String(fetchError);
    throw new Error(`Network error: ${errorMessage}`);
  }
}

// Remove authentication token (for logout)
async function logoutGoogle(): Promise<void> {
  return new Promise((resolve) => {
    chrome.identity.getAuthToken({ interactive: false }, (token) => {
      if (token) {
        chrome.identity.removeCachedAuthToken({ token }, () => resolve());
      } else {
        resolve();
      }
    });
  });
}

// バックグラウンドからカレンダー同期を実行
async function performCalendarSync() {
  try {
    console.log('バックグラウンドから自動同期を実行します');
    
    // TACTタブがあるかどうかを確認
    const tactTabs = await new Promise<chrome.tabs.Tab[]>((resolve) => {
      chrome.tabs.query({ url: 'https://tact.ac.thers.ac.jp/*' }, (tabs) => {
        resolve(tabs);
      });
    });
    
    if (tactTabs.length === 0) {
      console.log('TACTタブが見つかりません。同期をスキップします。');
      // 次回アラームの準備（スキップしてもアラームは継続する）
      chrome.storage.local.get(['lastSyncAttempt'], (result) => {
        const now = Date.now();
        // 最後の試行から30分以上経過している場合はTACTタブを開くプロンプトを表示
        if (!result.lastSyncAttempt || (now - result.lastSyncAttempt > 30 * 60 * 1000)) {
          showNotification('同期に必要なTACTタブがありません', 
            'カレンダー同期にはTACTページが必要です。同期を開始するにはTACTにログインしてください。');
          chrome.storage.local.set({ lastSyncAttempt: now });
        }
      });
      return { error: 'TACT_TAB_NOT_FOUND' };
    }
    
    // TACTタブにデータ取得メッセージを送信
    const tab = tactTabs[0];
    let data;
    try {
      data = await new Promise<any>((resolve, reject) => {
        chrome.tabs.sendMessage(tab.id!, { action: 'getSakaiDataForSync' }, async (response) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
            return;
          }
          if (!response || !response.success) {
            reject(new Error(response?.error || 'データ取得エラー'));
            return;
          }
          resolve(response.data);
        });
      });
    } catch (contentScriptError) {
      console.error('コンテンツスクリプトからのデータ取得に失敗:', contentScriptError);
      // TACTページでコンテンツスクリプトが正しく動作していない場合
      showNotification('同期データの取得に失敗しました', 
        'TACTページを再読み込みして再度お試しください。');
      return { error: 'CONTENT_SCRIPT_ERROR', details: String(contentScriptError) };
    }
    
    if (!data || (!data.assignments && !data.quizzes)) {
      console.log('同期するデータが見つかりませんでした');
      return { assignments: [], quizzes: [], errors: [] };
    }
    
    // Googleカレンダーに同期
    let token;
    try {
      token = await authenticateGoogle();
    } catch (authError) {
      console.error('Google認証に失敗:', authError);
      showNotification('Googleカレンダー同期エラー', 
        'Googleアカウントの認証に失敗しました。設定を確認してください。');
      return { error: 'AUTH_ERROR', details: String(authError) };
    }
    
    const result = await syncToCalendar(data, token);
    
    // 最終同期時刻を保存
    chrome.storage.local.set({ lastSyncTime: Date.now() });
    
    // 結果の通知
    const totalEvents = result.assignments.length + result.quizzes.length;
    if (totalEvents > 0) {
      showNotification('カレンダー同期完了', 
        `${totalEvents}件のイベントをGoogleカレンダーに同期しました`);
    }
    
    console.log(`自動同期完了: ${totalEvents}件のイベントを作成しました`);
    
    // 同期結果をTACTタブに通知
    if (tab.id) {
      try {
        chrome.tabs.sendMessage(tab.id, { 
          action: 'syncCompleted', 
          result: {
            assignments: result.assignments.length,
            quizzes: result.quizzes.length,
            errors: result.errors.length
          }
        });
      } catch (notifyError) {
        console.error('同期結果通知のエラー:', notifyError);
      }
    }
    
    return result;
  } catch (error) {
    console.error('自動同期に失敗しました:', error);
    showNotification('カレンダー同期エラー', 'カレンダー同期処理中にエラーが発生しました。');
    return { error: 'SYNC_ERROR', details: String(error) };
  }
}

// serviceWorkerの起動時に初期化
init();
