/**
 * -----------------------------------------------------------------
 * Modified by: roz
 * Date       : 2025-08-12
 * Changes    : アカウント選択対応/スコープ統一 + Googleステータス検出を改善（非対話でも確認） + Chooserで id_token も取得
 * Category   : バックグラウンド処理・認証
 * -----------------------------------------------------------------
 */
// For debugging

// カレンダー同期用のアラーム名 
const CALENDAR_SYNC_ALARM_NAME = 'calendarSyncAlarm';
// 既存（レガシー）カレンダー同期機能の一時無効化フラグ
const LEGACY_CALENDAR_SYNC_DISABLED = true;

// Google OAuth クライアントID
// - MANIFEST_OAUTH_CLIENT_ID: chrome.identity.getAuthToken 用（manifest.jsonのoauth2.client_id）
// - GOOGLE_OAUTH_CLIENT_ID  : launchWebAuthFlow 用（WebアプリのOAuthクライアントIDを推奨）
import { WEB_OAUTH_CLIENT_ID, HOSTED_DOMAIN_HINT } from './config/google-oauth';
/**
 * -----------------------------------------------------------------
 * Modified by: roz
 * Date       : 2025-08-14
 * Changes    : Move MANIFEST_OAUTH_CLIENT_ID to env var
 * Category   : バックグラウンド処理・認証
 * -----------------------------------------------------------------
 */
// 環境変数が未設定でも manifest.oauth2.client_id をフォールバックとして使用
const MANIFEST_OAUTH_CLIENT_ID = (process.env.MANIFEST_OAUTH_CLIENT_ID || (() => {
  try {
    // MV3 Service Worker 上でのみ利用可能
    // @ts-ignore
    const m = chrome.runtime.getManifest?.();
    // @ts-ignore
    return (m && m.oauth2 && m.oauth2.client_id) ? m.oauth2.client_id as string : '';
  } catch { return ''; }
})());
const GOOGLE_OAUTH_CLIENT_ID = WEB_OAUTH_CLIENT_ID || MANIFEST_OAUTH_CLIENT_ID;

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
  // 既存同期機能は無効化中のため、アラーム設定をスキップ
  if (!LEGACY_CALENDAR_SYNC_DISABLED) {
    setupCalendarSyncAlarm();
  }
}

// カレンダー同期用のアラームをセットアップ
async function setupCalendarSyncAlarm() {
  if (LEGACY_CALENDAR_SYNC_DISABLED) return;
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
          console.log('[DEBUG] authenticateGoogle action received');
          // Use incremental authentication with minimal required scopes
          const requestedScopes = request.scopes || [
            'https://www.googleapis.com/auth/calendar',
            'https://www.googleapis.com/auth/userinfo.email',
            'https://www.googleapis.com/auth/userinfo.profile'
          ];
          console.log('[DEBUG] Requested scopes:', requestedScopes);
          const token = await authenticateGoogle();
          console.log('[DEBUG] Authentication completed, token received:', !!token);
          sendResponse({ success: true, token });
          break;
        }
        case 'authenticateGoogleChooser': {
          console.log('[DEBUG] authenticateGoogleChooser action received');
          const scopes: string[] = request.scopes || [
            'openid',
            'email',
            'profile',
            'https://www.googleapis.com/auth/calendar',
            'https://www.googleapis.com/auth/userinfo.email',
            'https://www.googleapis.com/auth/userinfo.profile'
          ];
          // Do not default to HOSTED_DOMAIN_HINT; only use if explicitly provided
          const hd: string | undefined = request.hd; // e.g., 'thers.ac.jp'
          const forceConsent: boolean = !!request.forceConsent;
          try {
            const result = await authenticateGoogleWithChooser(scopes, hd, forceConsent);
            sendResponse({ success: true, ...result });
          } catch (e: any) {
            sendResponse({ success: false, error: e?.message || String(e) });
          }
          break;
        }
        case 'syncToCalendar': {
          // 既存（レガシー）同期を無効化
          if (LEGACY_CALENDAR_SYNC_DISABLED) {
            sendResponse({ success: false, error: 'Legacy calendar sync is currently disabled' });
            break;
          }
          const result = await syncToCalendar(request.data, request.token);
          sendResponse({ success: true, result });
          break;
        }
        case 'manualSyncToCalendar': {
          // 手動同期用のエンドポイント（レガシーフラグに関係なく実行）
          try {
            const result = await syncToCalendar(request.data, request.token);
            try {
              const created = (result?.assignments?.length || 0) + (result?.quizzes?.length || 0);
              if (created > 0) await incrementDailyUsageLocal();
              chrome.storage.local.set({ lastSyncResult: { ts: Date.now(), assignments: (result?.assignments?.length||0), quizzes: (result?.quizzes?.length||0), errors: (result?.errors?.length||0) } });
            } catch {}
            sendResponse({ success: true, result });
          } catch (e: any) {
            sendResponse({ success: false, error: e?.message || String(e) });
          }
          break;
        }
        case 'getGoogleAccounts': {
          console.log('[DEBUG] getGoogleAccounts action received');
          const accounts = await getGoogleAccounts();
          console.log('[DEBUG] Retrieved accounts:', accounts.length, 'accounts');
          sendResponse({ success: true, accounts });
          break;
        }
        case 'logout': {
          console.log('🔧 [LOGOUT DEBUG] Logout action received');
          try {
            await logoutGoogle();
            console.log('🔧 [LOGOUT DEBUG] Logout completed successfully');
            
            // Notify user of successful logout
            showNotification('ログアウト完了', 'Googleアカウントからログアウトしました。再度同期するには再認証が必要です。');
            
            sendResponse({ success: true, message: 'Complete logout successful' });
          } catch (error) {
            console.error('🔧 [LOGOUT DEBUG] Logout failed:', error);
            sendResponse({ success: false, error: (error as Error).message });
          }
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
  if (LEGACY_CALENDAR_SYNC_DISABLED) return;
  if (alarm.name === CALENDAR_SYNC_ALARM_NAME) {
    console.log('カレンダー同期アラームが発火しました');
    await performCalendarSync();
  }
});

// JST当日キー（YYYY-MM-DD）
function getTodayKeyJst(): string {
  const ms = Date.now() + 9 * 60 * 60 * 1000; // JST補正
  return new Date(ms).toISOString().slice(0, 10);
}

// 1日あたりの最大同期回数
const DAILY_MAX_SYNC = 4;

// 日次使用回数をインクリメント
async function incrementDailyUsageLocal(): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.get(['todayUsedCount', 'usageDateJst'], (r) => {
      const today = getTodayKeyJst();
      const isSame = r?.usageDateJst === today;
      const cnt = (isSame ? (r?.todayUsedCount || 0) : 0) + 1;
      chrome.storage.local.set({ usageDateJst: today, todayUsedCount: cnt }, () => resolve());
    });
  });
}

// 最後の同期から設定間隔以上経過、かつ日次上限未満かをチェック
async function shouldAutoSync(): Promise<boolean> {
  return new Promise((resolve) => {
    chrome.storage.local.get(['lastSyncTime', 'calendarSyncInterval', 'autoSyncEnabled', 'todayUsedCount', 'usageDateJst', 'syncBypassEnabled', 'syncBypassKey'], (result) => {
      // 自動同期が無効化されている場合は同期しない
      const autoSyncEnabled = result.autoSyncEnabled !== false; // デフォルトはtrue
      if (!autoSyncEnabled) {
        resolve(false);
        return;
      }

      // テストバイパス（キーが入力され、バイパス有効なら制限無視）
      if (result.syncBypassEnabled && typeof result.syncBypassKey === 'string' && result.syncBypassKey.trim().length > 0) {
        resolve(true);
        return;
      }

      const lastSyncTime = result.lastSyncTime || 0;
      // 最小間隔180分（3時間）を強制
      const MIN_INTERVAL_MIN = 180;
      const configured = (result.calendarSyncInterval || 60);
      const effectiveMinutes = Math.max(MIN_INTERVAL_MIN, configured);
      const interval = effectiveMinutes * 60 * 1000;
      const now = Date.now();
      
      // 日次上限チェック
      const today = getTodayKeyJst();
      const used = (result.usageDateJst === today) ? (result.todayUsedCount || 0) : 0;
      const hasQuota = used < DAILY_MAX_SYNC;

      // 最終同期時間 + 同期間隔 < 現在時刻 なら同期が必要（未同期=0なら即判定）
      const needsSync = lastSyncTime + interval < now;
      resolve(needsSync && hasQuota);
    });
  });
}

// Google OAuth authentication with enhanced security
async function authenticateGoogle(): Promise<string> {
  console.log('[DEBUG] authenticateGoogle function started');
  
  // 既存トークンを削除してから新規認証を行う
  await new Promise<void>((resolve) => {
    chrome.identity.getAuthToken({ interactive: false }, (token) => {
      const err = chrome.runtime.lastError;
      if (err) {
        // Benign when no grant exists yet or user revoked it; proceed silently
        if (err.message?.includes('OAuth2 not granted') || err.message?.includes('not signed in') || err.message?.includes('User not signed in')) {
          resolve();
          return;
        }
        console.warn('[AUTH DEBUG] getAuthToken(non-interactive) error:', err.message || err);
        resolve();
        return;
      }
      if (token) {
        chrome.identity.removeCachedAuthToken({ token }, () => resolve());
      } else {
        resolve();
      }
    });
  });

  return new Promise((resolve, reject) => {
    // Generate cryptographically secure state parameter for CSRF protection
    const state = generateSecureState();
    console.log('[DEBUG] Generated CSRF state');
    
    // Store state parameter for verification
    chrome.storage.local.set({ 'oauth_state': state }, () => {
      console.log('[DEBUG] Stored OAuth state, starting getAuthToken...');
      chrome.identity.getAuthToken({ 
        interactive: true,
        // Add state parameter for CSRF protection where possible
        scopes: [
          'https://www.googleapis.com/auth/calendar.events',
          'https://www.googleapis.com/auth/userinfo.email',
          'https://www.googleapis.com/auth/userinfo.profile'
        ]
      }, (token) => {
        console.log('[DEBUG] getAuthToken callback executed');
        console.log('[DEBUG] Chrome runtime error:', chrome.runtime.lastError);
        console.log('[DEBUG] Token received:', !!token);
        
        if (chrome.runtime.lastError || !token) {
          console.log('[DEBUG] Authentication failed:', chrome.runtime.lastError?.message);
          // Clear stored state on failure
          chrome.storage.local.remove('oauth_state');
          reject(new Error(chrome.runtime.lastError?.message || 'No token'));
        } else {
          console.log('[DEBUG] Token received, verifying security...');
          // Verify token validity before returning
          verifyTokenSecurity(token)
            .then(() => {
              console.log('[DEBUG] Token security verified');
              // Clear state after successful verification
              chrome.storage.local.remove('oauth_state');
              // Mark that user has explicitly authenticated
              chrome.storage.local.set({ 'userAuthenticatedExplicitly': true }, () => {
                console.log('[DEBUG] User authentication flag set');
                resolve(token);
              });
            })
            .catch((error) => {
              console.log('[DEBUG] Token security verification failed:', error);
              console.log('[DEBUG] Clearing authentication and retrying...');
              chrome.storage.local.remove('oauth_state');
              
              // Clear the failed token and try fresh authentication
              chrome.identity.removeCachedAuthToken({ token }, () => {
                console.log('[DEBUG] Cached token cleared, attempting fresh authentication...');
                // Recursive call for fresh authentication (only once to avoid infinite loop)
                clearAuthenticationAndReauth()
                  .then(resolve)
                  .catch(reject);
              });
            });
        }
      });
    });
  });
}

// Helper: parse URL hash fragment like '#access_token=...&...'
function parseFragment(fragment: string): Record<string, string> {
  const out: Record<string, string> = {};
  const frag = fragment.startsWith('#') ? fragment.substring(1) : fragment;
  for (const pair of frag.split('&')) {
    const [k, v] = pair.split('=');
    if (k) out[decodeURIComponent(k)] = decodeURIComponent(v || '');
  }
  return out;
}

// OAuth via account chooser and optional hosted-domain hint using launchWebAuthFlow
/**
 * -----------------------------------------------------------------
 * Modified by: roz
 * Date       : 2025-08-14
 * Changes    : 非強制時のアカウント選択プロンプトを抑止（prompt未指定）。
 * Category   : 認証・UX
 * -----------------------------------------------------------------
 */
async function authenticateGoogleWithChooser(scopes: string[], hdHint?: string, forceConsent = false): Promise<{ token: string; idToken?: string; }> {
  const redirectUri = chrome.identity.getRedirectURL('oauth2');
  const nonce = generateSecureState();
  const params = new URLSearchParams({
    client_id: GOOGLE_OAUTH_CLIENT_ID,
    response_type: 'token id_token',
    redirect_uri: redirectUri,
    scope: scopes.join(' '),
    include_granted_scopes: forceConsent ? 'false' : 'true',
    nonce
  });
  // 非強制時はアカウント選択を毎回促さない（既存セッションを尊重）
  if (forceConsent) params.set('prompt', 'select_account consent');
  if (hdHint) params.set('hd', hdHint);
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

  const redirectResponse = await new Promise<string>((resolve, reject) => {
    chrome.identity.launchWebAuthFlow({ url: authUrl, interactive: true }, (responseUrl) => {
      if (chrome.runtime.lastError || !responseUrl) {
        reject(new Error(chrome.runtime.lastError?.message || 'launchWebAuthFlow failed'));
        return;
      }
      resolve(responseUrl);
    });
  });

  const url = new URL(redirectResponse);
  const frag = parseFragment(url.hash);
  const token = frag['access_token'];
  const idToken = frag['id_token'];
  if (!token) throw new Error('No access_token in OAuth response');

  // Verify token
  await verifyTokenSecurity(token);

  // Fetch userinfo for status caching (no domain enforcement by default)
  try {
    const resp = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (resp.ok) {
      const ui = await resp.json();
      chrome.storage.local.set({ 'google_user_info': {
        id: ui?.sub || ui?.id,
        email: ui?.email,
        name: ui?.name,
        picture: ui?.picture,
        verified_email: ui?.email_verified,
        hd: ui?.hd || null,
        ts: Date.now()
      }, 'google_auth_token': token });
      if (hdHint) {
        const email: string | undefined = ui?.email;
        const verified: boolean | undefined = ui?.email_verified;
        const hd: string | undefined = ui?.hd;
        if (!verified || !email) throw new Error('Unverified Google account');
        const domainOk = (hd && hd === hdHint) || (!!email && email.endsWith(`@${hdHint}`));
        if (!domainOk) throw new Error(`This account is not in ${hdHint}`);
      }
    }
  } catch (e) {
    console.warn('userinfo caching skipped:', e);
  }

  // Mark explicit auth
  chrome.storage.local.set({ 'userAuthenticatedExplicitly': true });
  return { token, idToken };
}

// Generate cryptographically secure state parameter
function generateSecureState(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Verify token security and validity
async function verifyTokenSecurity(token: string): Promise<void> {
  console.log('🔧 [TOKEN DEBUG] Starting token security verification...');
  try {
    // Verify token by making a test API call (preferred endpoint)
    const response = await fetch('https://oauth2.googleapis.com/tokeninfo?access_token=' + token);
    console.log('🔧 [TOKEN DEBUG] Token info response status:', response.status);
    
    if (!response.ok) {
      throw new Error('Token verification failed');
    }
    
    const tokenInfo = await response.json();
    console.log('🔧 [TOKEN DEBUG] Token info received:', {
      aud: tokenInfo.aud,
      scope: tokenInfo.scope,
      expires_in: tokenInfo.expires_in
    });
    
    // Verify token audience (client_id): accept manifest client and WEB_OAUTH_CLIENT_ID
    const manifestClientId = MANIFEST_OAUTH_CLIENT_ID || '';
    const accepted = new Set<string>(manifestClientId ? [manifestClientId] : []);
    try { if (WEB_OAUTH_CLIENT_ID) accepted.add(WEB_OAUTH_CLIENT_ID); } catch {}
    if (!accepted.has(tokenInfo.aud)) {
      console.error('🔧 [TOKEN DEBUG] Client ID mismatch:', tokenInfo.aud, 'vs accepted:', Array.from(accepted).join(', '));
      throw new Error('Token audience verification failed');
    }
    console.log('🔧 [TOKEN DEBUG] Client ID verification passed');
    
    // Verify required scopes are present
    const requiredUserScopes = [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile'
    ];
    
    const tokenScopes = tokenInfo.scope ? tokenInfo.scope.split(' ') : [];
    const hasCalendarAny = tokenScopes.includes('https://www.googleapis.com/auth/calendar') || tokenScopes.includes('https://www.googleapis.com/auth/calendar.events');
    const missingUserScopes = requiredUserScopes.filter(scope => !tokenScopes.includes(scope));
    console.log('🔧 [TOKEN DEBUG] Granted scopes:', tokenScopes);
    console.log('🔧 [TOKEN DEBUG] Has calendar(any):', hasCalendarAny, 'Missing user scopes:', missingUserScopes);
    if (!hasCalendarAny || missingUserScopes.length > 0) {
      const missing = [!hasCalendarAny ? 'calendar or calendar.events' : '', ...missingUserScopes].filter(Boolean).join(', ');
      throw new Error('Required scopes not granted: ' + missing);
    }
    console.log('🔧 [TOKEN DEBUG] Scope verification passed');
    
    // Verify token expiry
    const expiresIn = parseInt(tokenInfo.expires_in);
    console.log('🔧 [TOKEN DEBUG] Token expires in:', expiresIn, 'seconds');
    if (expiresIn < 60) // Less than 1 minute remaining
      throw new Error('Token expires too soon');
    console.log('🔧 [TOKEN DEBUG] Token security verification completed successfully');
  } catch (error) {
    console.error('🔧 [TOKEN DEBUG] Token verification error:', error);
    throw new Error('Token security verification failed');
  }
}

// Get user's Google accounts - only when explicitly requested
async function getGoogleAccounts(): Promise<any[]> {
  console.log('🔧 [AUTH DEBUG] getGoogleAccounts function started');
  return new Promise((resolve) => {
    // Check if user has explicitly authenticated
    chrome.storage.local.get(['userAuthenticatedExplicitly'], (result) => {
      console.log('🔧 [AUTH DEBUG] userAuthenticatedExplicitly flag:', result.userAuthenticatedExplicitly);
      
      const proceed = async () => {
        console.log('🔧 [AUTH DEBUG] Checking for existing tokens (non-interactive)...');
        chrome.identity.getAuthToken({ interactive: false }, async (token) => {
          console.log('🔧 [AUTH DEBUG] getAuthToken (non-interactive) callback executed');
          console.log('🔧 [AUTH DEBUG] Token exists:', !!token);
          console.log('🔧 [AUTH DEBUG] Chrome runtime error:', chrome.runtime.lastError);
          
          const tryFetchUserInfo = async (tokenToUse: string, on401: () => void) => {
            try {
              // Query Google OAuth userinfo; success implies token is valid for status purposes
              const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { 
                  'Authorization': `Bearer ${tokenToUse}`,
                  'Accept': 'application/json',
                  'Cache-Control': 'no-cache'
                }
              });
              
              console.log('[DEBUG] User info fetch response status:', response.status);
              
              if (response.ok) {
                const userInfo = await response.json();
                console.log('[DEBUG] User info received:', { 
                  email: userInfo.email, 
                  name: userInfo.name, 
                  verified: userInfo.email_verified 
                });
                
                // Validate user info structure
                if (!userInfo.email || !userInfo.email_verified) {
                  throw new Error('Invalid or unverified user info');
                }
                
                resolve([
                  {
                    id: userInfo.sub || userInfo.id, // Use 'sub' (subject) as primary ID
                    email: userInfo.email,
                    name: userInfo.name,
                    picture: userInfo.picture,
                    verified_email: userInfo.email_verified
                  }
                ]);
              } else if (response.status === 401) {
                console.log('[DEBUG] Token expired (401), attempting cached user info fallback');
                chrome.storage.local.get(['google_user_info'], (r) => {
                  const ui = r.google_user_info;
                  if (ui && ui.email) {
                    resolve([{ id: ui.id, email: ui.email, name: ui.name, picture: ui.picture, verified_email: ui.verified_email }]);
                  } else {
                    // No cache, clear flag and require reauth
                    chrome.storage.local.remove('userAuthenticatedExplicitly');
                    console.log('Token expired and no cache; user needs to re-authenticate');
                    resolve([]);
                  }
                });
              } else {
                console.error('[DEBUG] User info fetch failed:', response.status, response.statusText);
                // Fall back to cached user info if available
                chrome.storage.local.get(['google_user_info'], (r) => {
                  const ui = r.google_user_info;
                  if (ui && ui.email) {
                    resolve([{ id: ui.id, email: ui.email, name: ui.name, picture: ui.picture, verified_email: ui.verified_email }]);
                  } else {
                    resolve([]);
                  }
                });
              }
            } catch (e) {
              console.error('[DEBUG] User info fetch error:', e);
              // Fall back to cached user info if available
              chrome.storage.local.get(['google_user_info'], (r) => {
                const ui = r.google_user_info;
                if (ui && ui.email) {
                  resolve([{ id: ui.id, email: ui.email, name: ui.name, picture: ui.picture, verified_email: ui.verified_email }]);
                } else {
                  resolve([]);
                }
              });
            }
          };
          
          if (!token) {
            console.log('[DEBUG] No existing token');
            // Try using stored token or cached user info
            chrome.storage.local.get(['google_auth_token', 'google_user_info'], async (r) => {
              const storedToken = r.google_auth_token as string | undefined;
              if (storedToken) {
                await tryFetchUserInfo(storedToken, () => resolve([]));
                return;
              }
              const ui = r.google_user_info;
              if (ui && ui.email) {
                resolve([{ id: ui.id, email: ui.email, name: ui.name, picture: ui.picture, verified_email: ui.verified_email }]);
              } else {
                resolve([]);
              }
            });
            return;
          }
          
          await tryFetchUserInfo(token, () => {
            console.log('[DEBUG] Token is invalid; attempting cached user info fallback');
            chrome.storage.local.get(['google_user_info'], (r) => {
              const ui = r.google_user_info;
              if (ui && ui.email) {
                resolve([{ id: ui.id, email: ui.email, name: ui.name, picture: ui.picture, verified_email: ui.verified_email }]);
              } else {
                chrome.storage.local.remove('userAuthenticatedExplicitly');
                resolve([]);
              }
            });
          });
        });
      };

      if (!result.userAuthenticatedExplicitly) {
        console.log('🔧 [AUTH DEBUG] User has not explicitly authenticated; attempting passive status check');
        proceed();
        return;
      }

      console.log('🔧 [AUTH DEBUG] User has explicitly authenticated, checking for existing tokens...');
      // Only check for existing tokens if user has explicitly authenticated
      chrome.identity.getAuthToken({ interactive: false }, async (token) => {
        console.log('🔧 [AUTH DEBUG] getAuthToken (non-interactive) callback executed');
        console.log('🔧 [AUTH DEBUG] Token exists:', !!token);
        console.log('🔧 [AUTH DEBUG] Chrome runtime error:', chrome.runtime.lastError);
        
          const tryFetchUserInfo = async (tokenToUse: string, on401: () => void) => {
            try {
            // Direct userinfo fetch for explicit flow as well
            const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { 
                'Authorization': `Bearer ${tokenToUse}`,
                'Accept': 'application/json',
                'Cache-Control': 'no-cache'
              }
            });
            
            console.log('[DEBUG] User info fetch response status:', response.status);
            
            if (response.ok) {
              const userInfo = await response.json();
              console.log('[DEBUG] User info received:', { 
                email: userInfo.email, 
                name: userInfo.name, 
                verified: userInfo.email_verified 
              });
              
              // Validate user info structure
              if (!userInfo.email || !userInfo.email_verified) {
                throw new Error('Invalid or unverified user info');
              }
              
              resolve([
                {
                  id: userInfo.sub || userInfo.id, // Use 'sub' (subject) as primary ID
                  email: userInfo.email,
                  name: userInfo.name,
                  picture: userInfo.picture,
                  verified_email: userInfo.email_verified
                }
              ]);
            } else if (response.status === 401) {
              console.log('[DEBUG] Token expired (401), clearing auth flag');
              // Token expired or invalid, clear explicit auth flag and return empty array
              chrome.storage.local.remove('userAuthenticatedExplicitly');
              console.log('Token expired, user needs to manually re-authenticate');
              resolve([]);
            } else {
              console.error('[DEBUG] User info fetch failed:', response.status, response.statusText);
              resolve([]);
            }
          } catch (e) {
            console.error('[DEBUG] User info fetch error:', e);
            resolve([]);
          }
        };
        
        if (!token) {
          console.log('[DEBUG] No existing token, attempting stored token/cached info');
          chrome.storage.local.get(['google_auth_token', 'google_user_info'], async (r) => {
            const storedToken = r.google_auth_token as string | undefined;
            if (storedToken) {
              await tryFetchUserInfo(storedToken, () => resolve([]));
              return;
            }
            const ui = r.google_user_info;
            if (ui && ui.email) {
              resolve([{ id: ui.id, email: ui.email, name: ui.name, picture: ui.picture, verified_email: ui.verified_email }]);
            } else {
              chrome.storage.local.remove('userAuthenticatedExplicitly');
              resolve([]);
            }
          });
          return;
        }
        
        await tryFetchUserInfo(token, () => {
          console.log('[DEBUG] Token is invalid, clearing auth flag');
          // Token is invalid, clear explicit auth flag and return empty array
          chrome.storage.local.remove('userAuthenticatedExplicitly');
          resolve([]);
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

// 既存イベントの有無をsakaiAssignmentIdで確認
async function findEventBySakaiId(sakaiId: string, token: string): Promise<any | null> {
  if (!sakaiId) return null;
  try {
    const params = new URLSearchParams({
      maxResults: '1',
      privateExtendedProperty: `sakaiAssignmentId=${encodeURIComponent(sakaiId)}`
    });
    const resp = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!resp.ok) return null;
    const j = await resp.json();
    const item = Array.isArray(j?.items) ? j.items[0] : null;
    return item || null;
  } catch {
    return null;
  }
}

// Sync assignments and quizzes to Google Calendar with enhanced security
async function syncToCalendar(data: any, token?: string): Promise<any> {
  // テスト用: 送信済みマークによる重複スキップを無効化するフラグ
  const DEDUPLICATION_ENABLED = false;
  if (!token) {
    // No token provided, cannot proceed with sync
    throw new Error('Authentication token required. Please login to Google first.');
  }
  
  // Validate and sanitize input data
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid sync data provided');
  }
  
  const results = {
    assignments: [] as any[],
    quizzes: [] as any[],
    existed: { assignments: [] as any[], quizzes: [] as any[] },
    previouslySent: { assignments: [] as any[], quizzes: [] as any[] },
    skipped: { assignments: [] as any[], quizzes: [] as any[] },
    inputCounts: { assignments: Array.isArray(data.assignments) ? data.assignments.length : 0, quizzes: Array.isArray(data.quizzes) ? data.quizzes.length : 0 },
    errors: [] as any[]
  };
  const sentKeys = await getSentEventKeys();
  const now = Math.floor(Date.now() / 1000);
  
  // Rate limiting: limit to 50 operations per sync to respect API limits
  let operationCount = 0;
  const maxOperations = 50;
  
  // Sync assignments
  if (data.assignments && Array.isArray(data.assignments)) {
    for (let i = 0; i < data.assignments.length && operationCount < maxOperations; i++) {
      const assignment = data.assignments[i];
      
      // Validate assignment data
      if (!assignment || typeof assignment !== 'object' || !assignment.title) {
        results.errors.push({ 
          type: 'assignment', 
          title: assignment?.title || 'Unknown', 
          error: 'Invalid assignment data' 
        });
        continue;
      }
      
      const due = assignment.dueTime || assignment.dueDate;
      if (!due || due <= now) { results.skipped.assignments.push({ title: assignment.title, reason: 'past_or_missing_due' }); continue; }
      
      const key = makeEventKey(assignment, 'assignment');
      if (DEDUPLICATION_ENABLED && sentKeys.has(key)) { results.previouslySent.assignments.push({ title: assignment.title }); continue; }

      // 既存イベント確認（sakaiAssignmentId）
      try {
        const existed = await findEventBySakaiId(String(assignment.id || ''), token);
        if (existed) { results.existed.assignments.push({ title: assignment.title, eventId: existed.id, link: existed.htmlLink }); continue; }
      } catch {}
      
      try {
        const event = await createCalendarEvent(assignment, 'assignment', token!);
        results.assignments.push({ title: assignment.title, success: true, eventId: event.id });
        if (DEDUPLICATION_ENABLED) await addSentEventKey(key);
        operationCount++;
      } catch (error: any) {
        results.errors.push({ type: 'assignment', title: assignment.title, error: error.message });
      }
    }
  }
  
  // Sync quizzes
  if (data.quizzes && Array.isArray(data.quizzes)) {
    for (let i = 0; i < data.quizzes.length && operationCount < maxOperations; i++) {
      const quiz = data.quizzes[i];
      
      // Validate quiz data
      if (!quiz || typeof quiz !== 'object' || !quiz.title) {
        results.errors.push({ 
          type: 'quiz', 
          title: quiz?.title || 'Unknown', 
          error: 'Invalid quiz data' 
        });
        continue;
      }
      
      const due = quiz.dueTime || quiz.dueDate;
      if (!due || due <= now) { results.skipped.quizzes.push({ title: quiz.title, reason: 'past_or_missing_due' }); continue; }
      
      const key = makeEventKey(quiz, 'quiz');
      if (DEDUPLICATION_ENABLED && sentKeys.has(key)) { results.previouslySent.quizzes.push({ title: quiz.title }); continue; }

      try {
        const existed = await findEventBySakaiId(String(quiz.id || ''), token);
        if (existed) { results.existed.quizzes.push({ title: quiz.title, eventId: existed.id, link: existed.htmlLink }); continue; }
      } catch {}
      
      try {
        const event = await createCalendarEvent(quiz, 'quiz', token!);
        results.quizzes.push({ title: quiz.title, success: true, eventId: event.id });
        if (DEDUPLICATION_ENABLED) await addSentEventKey(key);
        operationCount++;
      } catch (error: any) {
        results.errors.push({ type: 'quiz', title: quiz.title, error: error.message });
      }
    }
  }
  
  // Log operation summary for security monitoring
  console.log(`Sync completed: ${operationCount} operations, ${results.errors.length} errors`);
  
  return results;
}

// Create a calendar event with enhanced security validation
async function createCalendarEvent(item: any, type: string, token: string): Promise<any> {
  // Verify token before making API calls
  await verifyTokenSecurity(token);
  
  // Validate input data
  if (!item || !item.title) {
    throw new Error('Invalid event data provided');
  }

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

  // Sanitize input data to prevent injection attacks
  const sanitizedTitle = sanitizeText(item.title);
  const courseName = sanitizeText(item.context || item.courseName || item.course || '');
  
  const summary = type === 'assignment' ? `課題: ${sanitizedTitle}` : `小テスト: ${sanitizedTitle}`;
  // sourceプロパティを有効なURLがある場合のみ付与
  let source: { title: string; url: string } | undefined = undefined;
  if (typeof item.url === 'string' && /^https?:\/\//.test(item.url)) {
    source = {
      title: 'Comfortable NU Extension',
      url: item.url
    };
  }

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
    ...(source ? { source } : {}),
    extendedProperties: {
      private: {
        sakaiAssignmentId: item.id || '',
        extensionVersion: '2.0.0',
        syncTimestamp: new Date().toISOString(),
        itemType: type
      }
    },
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
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Cache-Control': 'no-cache'
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
      
      // Handle specific error cases
      if (response.status === 401) {
        throw new Error('Authentication failed - token may be expired');
      } else if (response.status === 403) {
        throw new Error('Calendar access denied - check permissions');
      } else if (response.status === 409) {
        throw new Error('Event already exists or conflict detected');
      } else {
        const errMsg = (errorData && errorData.error && errorData.error.message) ? errorData.error.message : 'Unknown error';
        throw new Error(`Calendar API error (${response.status}): ${errMsg}`);
      }
    }
    let responseJson: any;
    try {
      responseJson = JSON.parse(responseBody);
    } catch (parseError) {
      throw new Error('Failed to parse Calendar API response');
    }
    
    // Validate response structure
    if (!responseJson.id || !responseJson.htmlLink) {
      throw new Error('Invalid response from Calendar API');
    }
    
    return responseJson;
  } catch (fetchError) {
    const errorMessage = fetchError instanceof Error ? fetchError.message : String(fetchError);
    throw new Error(`Network error: ${errorMessage}`);
  }
}

// Sanitize text input to prevent XSS and injection attacks
function sanitizeText(text: string): string {
  if (typeof text !== 'string') {
    return '';
  }
  
  // Remove potentially dangerous characters and scripts
  return text
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: URLs
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim()
    .substring(0, 500); // Limit length
}

// Complete logout - remove all authentication data and cached tokens
async function logoutGoogle(): Promise<void> {
  console.log('🔧 [LOGOUT DEBUG] Starting complete logout process...');
  
  return new Promise((resolve) => {
    // Step 1: Get and remove all cached auth tokens
    chrome.identity.getAuthToken({ interactive: false }, (token) => {
      const err = chrome.runtime.lastError;
      if (err && (err.message?.includes('OAuth2 not granted') || err.message?.includes('not signed in') || err.message?.includes('User not signed in'))) {
        console.log('🔧 [LOGOUT DEBUG] No OAuth grant (benign):', err.message);
      } else if (err) {
        console.warn('🔧 [LOGOUT DEBUG] getAuthToken(non-interactive) error:', err.message);
      }

      console.log('🔧 [LOGOUT DEBUG] Found existing token:', !!token);
      
      if (token) {
        // Remove the cached token
        chrome.identity.removeCachedAuthToken({ token }, () => {
          console.log('🔧 [LOGOUT DEBUG] Cached token removed');
          
          // Step 2: Clear all related storage data
          clearAllAuthenticationData(() => {
            console.log('🔧 [LOGOUT DEBUG] All authentication data cleared');
            resolve();
          });
        });
      } else {
        // No token found, just clear storage data
        clearAllAuthenticationData(() => {
          console.log('🔧 [LOGOUT DEBUG] All authentication data cleared (no token found)');
          resolve();
        });
      }
    });
  });
}

// Clear all authentication-related data from storage
function clearAllAuthenticationData(callback?: () => void): void {
  console.log('🔧 [LOGOUT DEBUG] Clearing all authentication storage data...');
  
  const keysToRemove = [
    'userAuthenticatedExplicitly',
    'oauth_state',
    'lastSyncTime',
    'sentEventKeys',
    'google_auth_token',
    'google_user_info',
    'calendar_permissions'
  ];
  
  chrome.storage.local.remove(keysToRemove, () => {
    console.log('🔧 [LOGOUT DEBUG] Storage data cleared:', keysToRemove);
    
    // Session storage is available in newer Chrome versions
    try {
      if ((chrome.storage as any).session) {
        (chrome.storage as any).session.clear(() => {
          console.log('🔧 [LOGOUT DEBUG] Session storage cleared');
          if (callback) callback();
        });
      } else {
        if (callback) callback();
      }
    } catch (error) {
      console.log('🔧 [LOGOUT DEBUG] Session storage not available');
      if (callback) callback();
    }
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
    
    // Googleカレンダーに同期 - 既存トークンのチェックのみ
    let token;
    try {
      // 非対話的認証のみ試行（既存トークンがある場合のみ）
      const accounts = await getGoogleAccounts();
      if (accounts.length === 0) {
        console.log('Googleアカウントが認証されていません。自動同期をスキップします。');
        showNotification('カレンダー同期スキップ', 
          'Googleアカウントにログインしてください。手動でカレンダー同期を実行してください。');
        return { error: 'NO_AUTH_TOKEN' };
      }
      
      // 既存トークンで認証を取得
      token = await new Promise<string>((resolve, reject) => {
        chrome.identity.getAuthToken({ interactive: false }, (token) => {
          if (chrome.runtime.lastError || !token) {
            reject(new Error('No valid authentication token'));
          } else {
            resolve(token);
          }
        });
      });
    } catch (authError) {
      console.error('Google認証トークンが無効:', authError);
      showNotification('カレンダー同期スキップ', 
        'Googleアカウントの認証が必要です。手動でカレンダー同期を実行してください。');
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

// Incremental authorization - request minimal scopes initially
async function authenticateGoogleIncremental(requiredScopes: string[] = []): Promise<string> {
  // Default minimal scopes for basic functionality
  const basicScopes = ['https://www.googleapis.com/auth/userinfo.email'];
  
  // Additional scopes for calendar functionality
  const calendarScopes = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/userinfo.profile'
  ];
  
  // Determine which scopes to request
  const scopesToRequest = requiredScopes.length > 0 ? requiredScopes : basicScopes;
  
  // 既存トークンを削除してから新規認証を行う
  await new Promise<void>((resolve) => {
    chrome.identity.getAuthToken({ interactive: false }, (token) => {
      if (token) {
        chrome.identity.removeCachedAuthToken({ token }, () => resolve());
      } else {
        resolve();
      }
    });
  });

  return new Promise((resolve, reject) => {
    // Generate secure state parameter
    const state = generateSecureState();
    
    chrome.storage.local.set({ 'oauth_state': state }, () => {
      chrome.identity.getAuthToken({ 
        interactive: true,
        scopes: scopesToRequest
      }, async (token) => {
        if (chrome.runtime.lastError || !token) {
          chrome.storage.local.remove('oauth_state');
          reject(new Error(chrome.runtime.lastError?.message || 'No token'));
        } else {
          try {
            // Verify token and check which scopes were actually granted
            await verifyTokenSecurity(token);
            
            // Check if we have all required scopes
            const tokenInfo = await getTokenInfo(token);
            const grantedScopes = tokenInfo.scope ? tokenInfo.scope.split(' ') : [];
            
            // If calendar access is needed but not granted, request additional permissions
            if (requiredScopes.includes('https://www.googleapis.com/auth/calendar') && 
                !grantedScopes.includes('https://www.googleapis.com/auth/calendar')) {
              
              // Request additional calendar permissions
              chrome.identity.getAuthToken({ 
                interactive: true,
                scopes: calendarScopes
              }, (calendarToken) => {
                chrome.storage.local.remove('oauth_state');
                if (chrome.runtime.lastError || !calendarToken) {
                  reject(new Error('Calendar permissions not granted'));
                } else {
                  resolve(calendarToken);
                }
              });
            } else {
              chrome.storage.local.remove('oauth_state');
              resolve(token);
            }
          } catch (error) {
            chrome.storage.local.remove('oauth_state');
            reject(error);
          }
        }
      });
    });
  });
}

// Get token information from Google
async function getTokenInfo(token: string): Promise<any> {
  const response = await fetch('https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=' + token);
  if (!response.ok) {
    throw new Error('Failed to get token info');
  }
  return await response.json();
}

// Enhanced scope validation and management
function validateRequiredScopes(grantedScopes: string[], requiredScopes: string[]): boolean {
  return requiredScopes.every(scope => grantedScopes.includes(scope));
}

// Check if user has granted specific permissions
async function hasPermission(scope: string): Promise<boolean> {
  return new Promise((resolve) => {
    chrome.identity.getAuthToken({ interactive: false }, async (token) => {
      if (!token) {
        resolve(false);
        return;
      }
      
      try {
        const tokenInfo = await getTokenInfo(token);
        const grantedScopes = tokenInfo.scope ? tokenInfo.scope.split(' ') : [];
        resolve(grantedScopes.includes(scope));
      } catch (error) {
        resolve(false);
      }
    });
  });
}

// Request specific permission if not already granted
async function requestPermissionIfNeeded(scope: string): Promise<string> {
  const hasScope = await hasPermission(scope);
  
  if (!hasScope) {
    // Request the specific scope incrementally
    return authenticateGoogleIncremental([scope]);
  } else {
    // Return existing token
    return new Promise((resolve, reject) => {
      chrome.identity.getAuthToken({ interactive: false }, (token) => {
        if (token) {
          resolve(token);
        } else {
          reject(new Error('No existing token'));
        }
      });
    });
  }
}

// Modified authentication function with granular scope control
async function authenticateGoogleWithScopes(scopes: string[]): Promise<string> {
  // Validate that only necessary scopes are requested
  const allowedScopes = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile'
  ];
  
  const validScopes = scopes.filter(scope => allowedScopes.includes(scope));
  
  if (validScopes.length === 0) {
    throw new Error('No valid scopes provided');
  }
  
  // 既存トークンを削除してから認証を開始
  await new Promise<void>((resolve) => {
    chrome.identity.getAuthToken({ interactive: false }, (token) => {
      if (token) {
        chrome.identity.removeCachedAuthToken({ token }, () => resolve());
      } else {
        resolve();
      }
    });
  });

  return authenticateGoogleIncremental(validScopes);
}

// Clear existing authentication and force re-authentication
async function clearAuthenticationAndReauth(): Promise<string> {
  console.log('🔧 [AUTH CLEAR] Clearing existing authentication...');
  
  // Clear stored authentication flags
  chrome.storage.local.remove(['userAuthenticatedExplicitly', 'oauth_state']);
  
  // Perform simple re-authentication without recursive verification
  return new Promise((resolve, reject) => {
    const state = generateSecureState();
    chrome.storage.local.set({ 'oauth_state': state }, () => {
      chrome.identity.getAuthToken({ 
        interactive: true,
        scopes: [
          'https://www.googleapis.com/auth/calendar',
          'https://www.googleapis.com/auth/userinfo.email',
          'https://www.googleapis.com/auth/userinfo.profile'
        ]
      }, (token) => {
        if (chrome.runtime.lastError || !token) {
          chrome.storage.local.remove('oauth_state');
          reject(new Error(chrome.runtime.lastError?.message || 'Fresh authentication failed'));
        } else {
          chrome.storage.local.remove('oauth_state');
          chrome.storage.local.set({ 'userAuthenticatedExplicitly': true }, () => {
            console.log('🔧 [AUTH CLEAR] Fresh authentication successful');
            resolve(token);
          });
        }
      });
    });
  });
}

// serviceWorkerの起動時に初期化
init();
