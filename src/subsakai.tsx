/**
 * -----------------------------------------------------------------
 * Modified by: roz
 * Date       : 2025-08-12
 * Changes    : Googleログイン/ログアウトUIとFirebase Auth連携を追加
 * Category   : 認証・UI
 * -----------------------------------------------------------------
 */
/**
 * -----------------------------------------------------------------
 * Modified by: roz
 * Date       : 2025-08-14
 * Changes    : 同期テストUI（サンプル予定作成・履歴クリア）を追加
 * Category   : 同期・UI
 * -----------------------------------------------------------------
 */
/**
 * -----------------------------------------------------------------
 * Modified by: roz
 * Date       : 2025-08-13
 * Changes    : App Check手動トークン受け渡しUI/ハンドラを追加
 * Category   : 認証・UI
 * -----------------------------------------------------------------
 */
import { loadHostName } from "./features/storage";
import { createRoot } from "react-dom/client";
import React from "react";
import { MiniSakaiRoot } from "./components/main";
import { 
    initializeFirebaseAppCheck, 
    testAppCheckConnection, 
    testCalendarSyncBackend,
    getCurrentFirebaseUser,
    signOutFirebase,
    callCloudFunction,
    prepareAppCheckForUserGesture,
    signInFirebaseWithGoogleAccessToken,
    setAppCheckTokenManually
} from "./firebase-appcheck";

/**
 * Initialize subSakai
 */
async function initSubSakai() {
    const hostname = await loadHostName();
    if (hostname === undefined) {
        console.warn("could not initialize subsakai");
        return;
    }

    const domRoot = document.querySelector("#subSakai");
    if (domRoot === null) {
        console.warn("could not find #subSakai");
        return;
    }
    const root = createRoot(domRoot);
    root.render(<MiniSakaiRoot subset={true} hostname={hostname} />);

    // Initialize Firebase App Check
    try {
        initializeFirebaseAppCheck();
        console.log("Firebase App Check initialized successfully");
    } catch (error) {
        console.error("Failed to initialize Firebase App Check:", error);
    }

    // Popup再オープン直後の一時的な未ログイン表示を避けるため、
    // 保存済みのGoogleアクセストークンでのサイレント再サインインを試行
    try {
        await attemptSilentFirebaseSignIn();
    } catch (e) {
        console.warn("Silent Firebase sign-in skipped:", e);
    }

    // 初期表示の認証状態を更新
    try {
        await updateAuthStatusUI();
    } catch (e) {
        console.warn("Failed to update auth status on init", e);
    }
}

/**
 * App Check test function
 */
async function handleAppCheckTest() {
    const resultDiv = document.getElementById("appCheckResult");
    if (!resultDiv) return;

    resultDiv.innerHTML = "🔄 テスト中...";
    
    try {
        const result = await testAppCheckConnection();
        
        if (result.success) {
            resultDiv.innerHTML = `
                <div style="color: green;">✅ ${result.message}</div>
                <div>レスポンス: ${JSON.stringify(result.data, null, 2)}</div>
                <div style="font-size: 11px; color: #666; margin-top: 5px;">
                    ${new Date().toLocaleString()}
                </div>
            `;
        } else {
            resultDiv.innerHTML = `
                <div style="color: red;">❌ ${result.message}</div>
                <div>エラー: ${result.error}</div>
                <div style="font-size: 11px; color: #666; margin-top: 5px;">
                    ${new Date().toLocaleString()}
                </div>
            `;
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        resultDiv.innerHTML = `
            <div style="color: red;">❌ 予期しないエラー</div>
            <div>${errorMessage}</div>
            <div style="font-size: 11px; color: #666; margin-top: 5px;">
                ${new Date().toLocaleString()}
            </div>
        `;
    }
}

/**
 * Calendar Sync backend connectivity test handler
 */
async function handleCalendarSyncTest() {
    const resultDiv = document.getElementById("calendarSyncTestResult");
    if (!resultDiv) return;

    resultDiv.innerHTML = "🔄 テスト中...";

    try {
        const result = await testCalendarSyncBackend();
        if (result.success) {
            resultDiv.innerHTML = `
                <div style=\"color: green;\">✅ ${result.message}</div>
                <div>レスポンス: ${JSON.stringify(result.data, null, 2)}</div>
                <div style=\"font-size: 11px; color: #666; margin-top: 5px;\">
                    ${new Date().toLocaleString()}
                </div>
            `;
        } else {
            resultDiv.innerHTML = `
                <div style=\"color: red;\">❌ ${result.message}</div>
                <div>エラー: ${result.error}</div>
                <div style=\"font-size: 11px; color: #666; margin-top: 5px;\">
                    ${new Date().toLocaleString()}
                </div>
            `;
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        resultDiv.innerHTML = `
            <div style=\"color: red;\">❌ 予期しないエラー</div>
            <div>${errorMessage}</div>
            <div style=\"font-size: 11px; color: #666; margin-top: 5px;\">
                ${new Date().toLocaleString()}
            </div>
        `;
    }
}

/**
 * Googleログイン: chrome.identityでトークン取得 → Firebase Authにサインイン
 */
async function handleGoogleLogin() {
    const resultDiv = document.getElementById("authStatus");
    if (resultDiv) resultDiv.innerHTML = "🔄 ログイン処理中...";

    try {
        // Chooserベース（token id_token）でログインし、Firebaseには id_token を優先して渡す
        const chooser: { token: string; idToken?: string } = await new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({ 
                action: 'authenticateGoogleChooser',
                scopes: [
                    'openid', 'email', 'profile',
                    'https://www.googleapis.com/auth/calendar',
                    'https://www.googleapis.com/auth/userinfo.email',
                    'https://www.googleapis.com/auth/userinfo.profile'
                ],
                forceConsent: true
            }, (resp) => {
                if (!resp || !resp.success) {
                    reject(new Error(resp?.error || 'Failed to authenticate with Google'));
                    return;
                }
                resolve({ token: resp.token, idToken: resp.idToken });
            });
        });

        // Firebase 連携: id_token を優先（無い場合のみ access_token フォールバックを内部で実施）
        try {
            // Prefer ID token via REST signInWithIdp (implemented in helper)
            // We still call the legacy access token method for backward compat; helper will fallback to ID token internally as needed
            await signInFirebaseWithGoogleAccessToken(chooser.token);
        } catch (_) {
            // helper will try id_token fallback; nothing else to do here
        }

        await updateAuthStatusUI();
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (resultDiv) resultDiv.innerHTML = `❌ ログイン失敗: ${msg}`;
    }
}

/**
 * 保存済みの Google アクセストークンからのサイレント Firebase サインイン
 */
async function attemptSilentFirebaseSignIn(): Promise<void> {
    const user = getCurrentFirebaseUser();
    if (user && !user.isAnonymous) return; // 既にサインイン済み
    await new Promise<void>((resolve) => {
        chrome.storage.local.get(["google_auth_token"], async (r) => {
            const token = r?.google_auth_token as string | undefined;
            if (!token) {
                resolve();
                return;
            }
            try {
                await signInFirebaseWithGoogleAccessToken(token);
            } catch (_) {
                // 失敗時は静かに無視（UIで未ログインと表示される）
            } finally {
                resolve();
            }
        });
    });
}

/**
 * THERSメールの所有確認: リンク発行リクエスト（backend: requestVerification）
 */
async function handleThersVerifyRequest() {
    console.log('[UI] handleThersVerifyRequest: start');
    const emailInput = document.getElementById("thersEmail") as HTMLInputElement | null;
    const status = document.getElementById("thersVerifyStatus");
    if (!emailInput || !status) return;
    const email = (emailInput.value || '').trim();
    if (!email.endsWith('@s.thers.ac.jp')) {
        status.textContent = '❌ s.thers.ac.jp のメールアドレスを入力してください';
        return;
    }
    // ユーザー操作直後にApp Checkを初期化してポップアップブロックを回避
    try { console.log('[UI] prepareAppCheckForUserGesture'); await prepareAppCheckForUserGesture(); console.log('[UI] prepareAppCheckForUserGesture: done'); } catch (e) { console.warn('[UI] prepareAppCheckForUserGesture error', e); }
    // Firebaseが未ログインなら先にGoogleログインを促す
    const fUser = getCurrentFirebaseUser();
    if (!fUser || fUser.isAnonymous) {
        status.textContent = '❌ 先に「Googleでログイン」を実行してください';
        return;
    }
    status.textContent = '🔄 認証リンクを発行中...';
    try {
        console.log('[UI] calling requestVerification');
        const res = await callCloudFunction('requestVerification', { email });
        console.log('[UI] requestVerification success', res);
        // メールでの所有確認フローに統一。リンクを別タブで開かず、案内のみ表示
        const url = res?.verificationUrl;
        if (url) {
            status.innerHTML = `✅ 認証メールを送信しました。メールのリンクを開いて確認を完了してください。<div style="margin-top:6px;font-size:12px;color:#666;">（送信未設定の場合、以下のリンクを手動で開いてください）<br/><a href="${url}" target="_blank" rel="noopener">${url}</a></div>`;
        } else {
            status.textContent = res?.message || '✅ 認証メールを送信しました。受信トレイを確認してください。';
        }
    } catch (e) {
        console.error('[UI] requestVerification error', e);
        status.textContent = `❌ 送信失敗: ${e instanceof Error ? e.message : String(e)}`;
    }
}

/**
 * App Check: ブローカで取得したトークンを手動で渡す
 */
async function handleManualAppCheckTokenSubmit() {
    const input = document.getElementById("manualAppCheckToken") as HTMLInputElement | null;
    const status = document.getElementById("appCheckManualStatus");
    if (!input || !status) return;
    const token = (input.value || '').trim();
    if (!token) {
        status.textContent = '❌ トークンを入力してください';
        return;
    }
    status.textContent = '🔄 反映中...';
    try {
        await setAppCheckTokenManually(token);
        // 簡易疎通チェック
        try {
            const res = await testAppCheckConnection();
            if (res?.success) {
                status.textContent = '✅ 反映しました（疎通OK）';
            } else {
                status.textContent = '⚠️ 反映は完了（疎通でエラー）';
            }
        } catch (_) {
            status.textContent = '✅ 反映しました（疎通テスト失敗は無視）';
        }
    } catch (e) {
        status.textContent = `❌ 反映失敗: ${e instanceof Error ? e.message : String(e)}`;
    }
}

/**
 * THERSメールの所有確認: トークン検証（backend: verifyEmail）
 */
async function handleThersVerifyConfirm() {
    console.log('[UI] handleThersVerifyConfirm: start');
    const codeInput = document.getElementById("thersCode") as HTMLInputElement | null;
    const emailInput = document.getElementById("thersEmail") as HTMLInputElement | null;
    const status = document.getElementById("thersVerifyStatus");
    if (!codeInput || !emailInput || !status) return;
    const token = (codeInput.value || '').trim();
    const email = (emailInput.value || '').trim();
    if (!token) {
        status.textContent = '❌ トークンを入力してください';
        return;
    }
    try { console.log('[UI] prepareAppCheckForUserGesture'); await prepareAppCheckForUserGesture(); console.log('[UI] prepareAppCheckForUserGesture: done'); } catch (e) { console.warn('[UI] prepareAppCheckForUserGesture error', e); }
    const fUser = getCurrentFirebaseUser();
    if (!fUser || fUser.isAnonymous) {
        status.textContent = '❌ 先に「Googleでログイン」を実行してください';
        return;
    }
    status.textContent = '🔄 検証中...';
    try {
        console.log('[UI] calling verifyEmailByLink');
        const res = await callCloudFunction('verifyEmailByLink', { email, token });
        console.log('[UI] verifyEmailByLink success');
        status.textContent = res?.message || '✅ THERSメールの確認に成功しました';
        // 認証状態に反映（バックエンドでカスタムクレーム/Firestore更新後に有効）
        await updateAuthStatusUI();
    } catch (e) {
        console.error('[UI] verifyEmail error', e);
        status.textContent = `❌ 検証失敗: ${e instanceof Error ? e.message : String(e)}`;
    }
}

/**
 * Googleログアウト: Chromeトークン/ストレージをクリアし、Firebaseからもサインアウト
 */
async function handleGoogleLogout() {
    const resultDiv = document.getElementById("authStatus");
    if (resultDiv) resultDiv.innerHTML = "🔄 ログアウト処理中...";

    try {
        await new Promise<void>((resolve, reject) => {
            chrome.runtime.sendMessage({ action: 'logout' }, (resp) => {
                if (!resp || !resp.success) {
                    reject(new Error(resp?.error || 'Failed to logout'));
                    return;
                }
                resolve();
            });
        });
        await signOutFirebase();
        await updateAuthStatusUI();
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (resultDiv) resultDiv.innerHTML = `❌ ログアウト失敗: ${msg}`;
    }
}

/**
 * 認証状態のUI更新: Googleアカウント情報 + Firebaseユーザー
 */
async function updateAuthStatusUI() {
    const resultDiv = document.getElementById("authStatus");
    if (!resultDiv) return;

    try {
        const googleAccounts: any[] = await new Promise((resolve) => {
            chrome.runtime.sendMessage({ action: 'getGoogleAccounts' }, (resp) => {
                resolve(resp && resp.success ? resp.accounts : []);
            });
        });

        // Fetch backend user status (THERS verification, usage, etc.)
        let backendLine = 'THERS: 未確認';
        try {
            const status: any = await callCloudFunction('getUserStatus', {});
            const v = !!status?.isVerified;
            const em = status?.email || '(未登録)';
            backendLine = `THERS: ${em} (verified: ${v})`;
        } catch (_) {
            // ignore and keep default
        }

        const fUser = getCurrentFirebaseUser();
        const now = new Date().toLocaleString();

        const googleLine = googleAccounts.length > 0
            ? (() => {
                const acc = googleAccounts[0] as any;
                const verified = (acc.verified_email ?? acc.verified ?? acc.emailVerified ?? false);
                return `Google: ${acc.email} (verified: ${verified})`;
              })()
            : 'Google: 未ログイン';
        const firebaseLine = fUser
            ? `Firebase: ${fUser.isAnonymous ? '匿名ユーザー' : (fUser.email || fUser.uid)}`
            : 'Firebase: 未ログイン';

        resultDiv.innerHTML = `
            ✅ 認証状態
            <div>${googleLine}</div>
            <div>${backendLine}</div>
            <div>${firebaseLine}</div>
            <div style="font-size: 11px; color: #666; margin-top: 5px;">${now}</div>
        `;
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        resultDiv.innerHTML = `❌ 認証状態の取得に失敗: ${msg}`;
    }
}

/**
 * サンプル予定をGoogleカレンダーに作成（同期テスト）
 */
async function handleCreateSampleEvent() {
    const resultDiv = document.getElementById("syncResult");
    if (resultDiv) resultDiv.innerHTML = "🔄 作成中...";

    try {
        // まず保存済みトークンを優先して利用（プロンプト抑止）
        const token = await new Promise<string | null>((resolve) => {
            try {
                chrome.storage.local.get(['google_auth_token'], (r) => {
                    const t = r?.google_auth_token as string | undefined;
                    resolve(t || null);
                });
            } catch { resolve(null); }
        });
        let accessToken: string;
        if (token) {
            // 軽量に有効性チェック（events.list）
            try {
                const params = new URLSearchParams({ maxResults: '1', timeMin: new Date(Date.now() - 5*60*1000).toISOString() });
                const test = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (test.ok) {
                    accessToken = token;
                } else {
                    throw new Error('token invalid');
                }
            } catch {
                // フォールバック: 選択UI（ただしforceConsentはfalse）
                accessToken = await new Promise((resolve, reject) => {
                    chrome.runtime.sendMessage({
                        action: 'authenticateGoogleChooser',
                        scopes: [
                            'openid', 'email', 'profile',
                            'https://www.googleapis.com/auth/calendar.events',
                            'https://www.googleapis.com/auth/userinfo.email',
                            'https://www.googleapis.com/auth/userinfo.profile'
                        ],
                        forceConsent: false
                    }, (resp) => {
                        if (!resp || !resp.success) { reject(new Error(resp?.error || 'Failed to authenticate with Google')); return; }
                        resolve(resp.token);
                    });
                });
            }
        } else {
            // トークンが無ければ選択UI（forceConsent: false）
            accessToken = await new Promise((resolve, reject) => {
                chrome.runtime.sendMessage({
                    action: 'authenticateGoogleChooser',
                    scopes: [
                        'openid', 'email', 'profile',
                        'https://www.googleapis.com/auth/calendar.events',
                        'https://www.googleapis.com/auth/userinfo.email',
                        'https://www.googleapis.com/auth/userinfo.profile'
                    ],
                    forceConsent: false
                }, (resp) => {
                    if (!resp || !resp.success) { reject(new Error(resp?.error || 'Failed to authenticate with Google')); return; }
                    resolve(resp.token);
                });
            });
        }

        // 10分後開始の1時間イベント（Asia/Tokyo）を作成（重複防止の sampleKey を付与し、既存チェック）
        const start = new Date(Date.now() + 10 * 60 * 1000);
        const end = new Date(start.getTime() + 60 * 60 * 1000);
        const pad = (n: number) => n.toString().padStart(2, '0');
        const keyBase = `${start.getFullYear()}${pad(start.getMonth()+1)}${pad(start.getDate())}${pad(start.getHours())}${pad(start.getMinutes())}`;
        const fUserForKey = getCurrentFirebaseUser();
        const uidPart = fUserForKey?.uid ? fUserForKey.uid.substring(0, 8) : 'anon';
        const sampleKey = `cnusample-${keyBase}-${uidPart}`;

        // 既存イベント検索（privateExtendedProperty=sampleKey=<value>）
        try {
            const params = new URLSearchParams({
                maxResults: '1',
                singleEvents: 'true',
                privateExtendedProperty: `sampleKey=${sampleKey}`,
                timeMin: new Date(Date.now() - 60*60*1000).toISOString(),
                timeMax: new Date(Date.now() + 48*60*60*1000).toISOString(),
            });
            const listResp = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            if (listResp.ok) {
                const data = await listResp.json();
                const existing = Array.isArray(data?.items) ? data.items[0] : null;
                if (existing) {
                    if (resultDiv) resultDiv.innerHTML = `⚠️ 既に作成済み: ${existing.htmlLink ? `<a href="${existing.htmlLink}" target="_blank">開く</a>` : existing.summary}`;
                    return;
                }
            }
        } catch (_) { /* 失敗時は作成へ進む */ }

        const event = {
            summary: 'Comfortable NU 同期テスト',
            description: '自動作成: 拡張の同期テスト（後で削除可）',
            start: { dateTime: start.toISOString(), timeZone: 'Asia/Tokyo' },
            end: { dateTime: end.toISOString(), timeZone: 'Asia/Tokyo' },
            reminders: { useDefault: false, overrides: [ { method: 'popup', minutes: 10 } ] },
            extendedProperties: { private: { sampleKey } }
        };
        const resp = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(event)
        });
        const text = await resp.text();
        if (!resp.ok) throw new Error(`Calendar API ${resp.status}: ${text}`);
        const json = JSON.parse(text);
        if (resultDiv) resultDiv.innerHTML = `✅ 作成成功: ${json.htmlLink ? `<a href="${json.htmlLink}" target="_blank">開く</a>` : 'OK'}`;
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (resultDiv) resultDiv.innerHTML = `❌ 作成失敗: ${msg}`;
    }
}

/**
 * サーバー側の同期履歴をクリア（回数/送信済みキー）
 */
async function handleClearSyncHistory() {
    const resultDiv = document.getElementById("syncResult");
    if (resultDiv) resultDiv.innerHTML = "🔄 クリア中...";
    try {
        const res = await callCloudFunction('clearSyncHistory', {});
        if (resultDiv) resultDiv.innerHTML = `✅ ${res?.message || '履歴をクリアしました'}`;
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (resultDiv) resultDiv.innerHTML = `❌ クリア失敗: ${msg}`;
    }
}

/**
 * アクティブなSakaiタブから課題/小テストを取得し、手動同期（BackgroundのmanualSyncToCalendar）
 */
async function handleSyncFromActivePage() {
    const resultDiv = document.getElementById("syncResult");
    if (resultDiv) resultDiv.innerHTML = '🔄 ページからデータ取得中...';
    try {
        // 1) トークン（プロンプト抑止で既存を優先）
        const token = await new Promise<string | null>((resolve) => {
            try { chrome.storage.local.get(['google_auth_token'], r => resolve((r?.google_auth_token as string) || null)); }
            catch { resolve(null); }
        });
        const accessToken: string = token ?? await new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({
                action: 'authenticateGoogleChooser',
                scopes: [
                    'openid', 'email', 'profile',
                    'https://www.googleapis.com/auth/calendar.events',
                    'https://www.googleapis.com/auth/userinfo.email',
                    'https://www.googleapis.com/auth/userinfo.profile'
                ],
                forceConsent: false
            }, (resp) => {
                if (!resp || !resp.success) { reject(new Error(resp?.error || 'Failed to authenticate with Google')); return; }
                resolve(resp.token);
            });
        });

        // 2) アクティブタブに問い合わせ
        const tab = await new Promise<chrome.tabs.Tab | undefined>((resolve) => {
            try { chrome.tabs.query({ active: true, currentWindow: true }, tabs => resolve(tabs?.[0])); } catch { resolve(undefined); }
        });
        if (!tab?.id) throw new Error('アクティブなタブが見つかりません');
        const pageData = await new Promise<any>((resolve, reject) => {
            try {
                chrome.tabs.sendMessage(tab.id!, { action: 'getSakaiDataForSync' }, (resp) => {
                    if (chrome.runtime.lastError) { reject(new Error(chrome.runtime.lastError.message)); return; }
                    if (!resp || !resp.success) { reject(new Error(resp?.error || 'データ取得に失敗しました')); return; }
                    resolve(resp.data);
                });
            } catch (e) { reject(e); }
        });
        if (resultDiv) resultDiv.innerHTML = `🔄 同期中... (課題${pageData?.assignments?.length || 0} / 小テスト${pageData?.quizzes?.length || 0})`;

        // 3) Background に手動同期を依頼（レガシーフラグに依存しない）
        const resp = await new Promise<any>((resolve, reject) => {
            chrome.runtime.sendMessage({ action: 'manualSyncToCalendar', data: pageData, token: accessToken }, (r) => {
                if (chrome.runtime.lastError) { reject(new Error(chrome.runtime.lastError.message)); return; }
                if (!r || !r.success) { reject(new Error(r?.error || 'manualSyncToCalendar 失敗')); return; }
                resolve(r.result);
            });
        });
        const totalSuccess = (resp?.assignments?.length || 0) + (resp?.quizzes?.length || 0);
        const totalErrors = resp?.errors?.length || 0;
        if (resultDiv) resultDiv.innerHTML = totalErrors === 0
            ? `✅ 同期完了: ${totalSuccess}件作成`
            : `⚠️ 同期完了: 成功${totalSuccess}件 / 失敗${totalErrors}件`;
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (resultDiv) resultDiv.innerHTML = `❌ 同期失敗: ${msg}`;
    }
}

// ===== 自動同期設定UI =====
async function loadAutoSyncUI() {
    const chk = document.getElementById('chkAutoSyncEnabled') as HTMLInputElement | null;
    const num = document.getElementById('numSyncInterval') as HTMLInputElement | null;
    const lblLast = document.getElementById('lblLastSync');
    const lblSent = document.getElementById('lblSentCount');
    const lblNext = document.getElementById('lblNextSync');
    const lblToday = document.getElementById('lblTodayCount');
    const lblLastRes = document.getElementById('lblLastResult');
    const chkBypass = document.getElementById('chkBypassEnabled') as HTMLInputElement | null;
    const txtBypass = document.getElementById('txtBypassKey') as HTMLInputElement | null;
    try {
        await new Promise<void>((resolve) => {
            chrome.storage.local.get(['autoSyncEnabled', 'calendarSyncInterval', 'lastSyncTime', 'sentEventKeys', 'syncBypassEnabled', 'syncBypassKey', 'usageDateJst', 'todayUsedCount', 'lastSyncResult'], (r) => {
                if (chk) chk.checked = r?.autoSyncEnabled !== false;
                if (num) num.value = String(r?.calendarSyncInterval || 60);
                if (lblLast) {
                    const t = r?.lastSyncTime as number | undefined;
                    lblLast.textContent = '最終同期: ' + (t ? new Date(t).toLocaleString() : 'なし');
                }
                if (lblSent) lblSent.textContent = '送信済み件数: ' + ((r?.sentEventKeys as any[] | undefined)?.length || 0);
                if (chkBypass) chkBypass.checked = !!r?.syncBypassEnabled;
                if (txtBypass) txtBypass.value = (r?.syncBypassKey as string) || '';

                // 今日の同期回数 n/4（JST）
                if (lblToday) {
                    const today = (() => { const ms = Date.now() + 9*60*60*1000; return new Date(ms).toISOString().slice(0,10); })();
                    const used = (r?.usageDateJst === today) ? (r?.todayUsedCount || 0) : 0;
                    lblToday.textContent = `本日の同期回数: ${used}/4`;
                }
                // 次回同期予定
                if (lblNext) {
                    const enabled = r?.autoSyncEnabled !== false;
                    if (!enabled) {
                        lblNext.textContent = '次回同期予定: 自動同期は無効です';
                    } else if (r?.syncBypassEnabled && (typeof r?.syncBypassKey === 'string') && r.syncBypassKey.trim().length>0) {
                        lblNext.textContent = '次回同期予定: バイパス有効中（条件に達し次第）';
                    } else {
                        const configured = Number(r?.calendarSyncInterval || 60);
                        const effectiveMin = Math.max(180, configured);
                        const last = Number(r?.lastSyncTime || 0);
                        const base = last>0 ? last : Date.now();
                        const nextTs = base + effectiveMin*60*1000;
                        lblNext.textContent = '次回同期予定: ' + new Date(nextTs).toLocaleString();
                    }
                }
                // 前回結果
                if (lblLastRes) {
                    const res = r?.lastSyncResult as any;
                    if (res && typeof res.ts === 'number') {
                        lblLastRes.textContent = `前回結果: 成功${(res.assignments||0)+(res.quizzes||0)} / 失敗${res.errors||0} (${new Date(res.ts).toLocaleString()})`;
                    } else {
                        lblLastRes.textContent = '前回結果: なし';
                    }
                }
                resolve();
            });
        });
    } catch {}
}

async function handleAutoSyncToggle() {
    const chk = document.getElementById('chkAutoSyncEnabled') as HTMLInputElement | null;
    const enabled = !!chk?.checked;
    chrome.storage.local.set({ autoSyncEnabled: enabled });
    try { chrome.runtime.sendMessage({ action: 'setAutoSyncEnabled', enabled }); } catch {}
}

async function handleIntervalChange() {
    const num = document.getElementById('numSyncInterval') as HTMLInputElement | null;
    let v = Math.max(180, Math.min(720, Number(num?.value || 180)));
    if (num) num.value = String(v);
    chrome.storage.local.set({ calendarSyncInterval: v });
    try { chrome.runtime.sendMessage({ action: 'updateSyncInterval' }); } catch {}
}

async function handleSyncNowClick() {
    const resDiv = document.getElementById('syncResult');
    if (resDiv) resDiv.innerHTML = '🔄 今すぐ同期中...';
    await handleSyncFromActivePage();
    await loadAutoSyncUI();
}

async function handleBypassToggle() {
    const chk = document.getElementById('chkBypassEnabled') as HTMLInputElement | null;
    chrome.storage.local.set({ syncBypassEnabled: !!chk?.checked });
}

async function handleBypassKeyChange() {
    const txt = document.getElementById('txtBypassKey') as HTMLInputElement | null;
    chrome.storage.local.set({ syncBypassKey: (txt?.value || '').trim() });
}

// Initialize and setup event listeners
initSubSakai();

// Setup App Check test button after DOM is ready
document.addEventListener("DOMContentLoaded", () => {
    // テストUIは削除

    const thersReqBtn = document.getElementById("btnThersRequest");
    if (thersReqBtn) thersReqBtn.addEventListener("click", handleThersVerifyRequest);
    // トークン確認は廃止

    const chkAuto = document.getElementById('chkAutoSyncEnabled');
    if (chkAuto) chkAuto.addEventListener('change', handleAutoSyncToggle);
    const numInterval = document.getElementById('numSyncInterval');
    if (numInterval) numInterval.addEventListener('change', handleIntervalChange);
    const btnSyncNow = document.getElementById('btnSyncNow');
    if (btnSyncNow) btnSyncNow.addEventListener('click', handleSyncNowClick);
    const chkBypass = document.getElementById('chkBypassEnabled');
    if (chkBypass) chkBypass.addEventListener('change', handleBypassToggle);
    const txtBypass = document.getElementById('txtBypassKey');
    if (txtBypass) txtBypass.addEventListener('change', handleBypassKeyChange);
    loadAutoSyncUI();

    // 同期テストUIは削除

    const loginBtn = document.getElementById("btnGoogleLogin");
    if (loginBtn) {
        loginBtn.addEventListener("click", handleGoogleLogin);
    }
    const logoutBtn = document.getElementById("btnGoogleLogout");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", handleGoogleLogout);
    }
    const refreshBtn = document.getElementById("btnAuthRefresh");
    if (refreshBtn) {
        refreshBtn.addEventListener("click", updateAuthStatusUI);
    }
});

// Also try to setup immediately (in case DOM is already ready)
setTimeout(() => {
    const testButton = document.getElementById("btnAppCheckTest");
    if (testButton) {
        testButton.addEventListener("click", handleAppCheckTest);
        console.log("App Check test button initialized (immediate)");
    }

    const calTestButton = document.getElementById("btnCalendarSyncTest");
    if (calTestButton) {
        calTestButton.addEventListener("click", handleCalendarSyncTest);
        console.log("Calendar Sync test button initialized (immediate)");
    }

    const loginBtn = document.getElementById("btnGoogleLogin");
    if (loginBtn) loginBtn.addEventListener("click", handleGoogleLogin);
    const logoutBtn = document.getElementById("btnGoogleLogout");
    if (logoutBtn) logoutBtn.addEventListener("click", handleGoogleLogout);
    const refreshBtn = document.getElementById("btnAuthRefresh");
    if (refreshBtn) refreshBtn.addEventListener("click", updateAuthStatusUI);

    const thersReqBtn = document.getElementById("btnThersRequest");
    if (thersReqBtn) thersReqBtn.addEventListener("click", handleThersVerifyRequest);
    const thersConfirmBtn = document.getElementById("btnThersConfirm");
    if (thersConfirmBtn) thersConfirmBtn.addEventListener("click", handleThersVerifyConfirm);

    const manualBtn = document.getElementById("btnManualAppCheckToken");
    if (manualBtn) manualBtn.addEventListener("click", handleManualAppCheckTokenSubmit);

    const chkAuto2 = document.getElementById('chkAutoSyncEnabled');
    if (chkAuto2) chkAuto2.addEventListener('change', handleAutoSyncToggle);
    const numInterval2 = document.getElementById('numSyncInterval');
    if (numInterval2) numInterval2.addEventListener('change', handleIntervalChange);
    const btnSyncNow2 = document.getElementById('btnSyncNow');
    if (btnSyncNow2) btnSyncNow2.addEventListener('click', handleSyncNowClick);
    const chkBypass2 = document.getElementById('chkBypassEnabled');
    if (chkBypass2) chkBypass2.addEventListener('change', handleBypassToggle);
    const txtBypass2 = document.getElementById('txtBypassKey');
    if (txtBypass2) txtBypass2.addEventListener('change', handleBypassKeyChange);
    loadAutoSyncUI();
}, 100);
