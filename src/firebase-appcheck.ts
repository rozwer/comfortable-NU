/**
 * -----------------------------------------------------------------
 * Modified by: roz
 * Date       : 2025-08-12
 * Changes    : GoogleアクセストークンでFirebase Authにサインインする機能を追加
 * Category   : 認証
 * -----------------------------------------------------------------
 */
/**
 * -----------------------------------------------------------------
 * Modified by: roz
 * Date       : 2025-08-13
 * Changes    : 手動App Checkトークン受け渡しAPIを追加（ブローカ非連携時のデバッグ用）
 * Category   : 認証・AppCheck
 * -----------------------------------------------------------------
 */
/**
 * Firebase App Check integration for Chrome Extension
 * Secure communication with Cloud Functions
 */

import { initializeApp, getApps } from "firebase/app";
import { 
  getAuth,
  initializeAuth,
  setPersistence,
  indexedDBLocalPersistence,
  browserLocalPersistence,
  onAuthStateChanged,
  User,
  GoogleAuthProvider,
  signInWithCredential,
  linkWithCredential,
  signOut,
  Auth
} from "firebase/auth";
import { WEB_OAUTH_CLIENT_ID } from "./config/google-oauth";
import { getFunctions, httpsCallable, Functions } from "firebase/functions";
import { firebaseConfig, FUNCTIONS_REGION } from "./firebase-config";
import { initializeAppCheck, CustomProvider } from "firebase/app-check";

let app: any;
let functions: Functions;
// Auth インスタンス。初期化前参照を防ぐため null で開始しヘルパーで取得
let auth: Auth | null = null;
let appCheckInitialized = false;
let appCheckInitInFlight: Promise<void> | null = null;

function getAuthInstance(): Auth {
  if (!auth) auth = getAuth(app);
  return auth;
}

/**
 * Initialize Firebase App and App Check (only once)
 */
function isExtensionEnvironment(): boolean {
  try {
    // chrome.runtime is available in extension pages/service workers
    return typeof chrome !== 'undefined' && !!chrome.runtime && !!chrome.runtime.id;
  } catch (_) { return false; }
}

function isPageContext(): boolean {
  try { return typeof window !== 'undefined' && typeof document !== 'undefined'; } catch { return false; }
}

export function initializeFirebaseAppCheck(): void {
  try {
    if (getApps().length === 0) {
      app = initializeApp(firebaseConfig);
      console.log("Firebase app initialized");
    } else {
      app = getApps()[0];
      console.log("Using existing Firebase app");
    }

    // App Check ブローカーは自動起動しない（初回の関数呼び出し前など必要時にのみ起動）

    if (!functions) {
      functions = getFunctions(app, FUNCTIONS_REGION);
      console.log(`Firebase Functions initialized for region: ${FUNCTIONS_REGION}`);
    }

    // Initialize Firebase Auth with durable persistence; avoid implicit anonymous sign-in
    if (!auth) {
      try {
        // Prefer explicit initialization with IndexedDB persistence (works in MV3 SW and pages)
        auth = initializeAuth(app, { persistence: indexedDBLocalPersistence });
      } catch (_) {
        // Fallback to getAuth if already initialized elsewhere
        auth = getAuth(app);
      }
      // In page contexts, promote to browserLocalPersistence when available
      try {
        setPersistence(getAuthInstance(), browserLocalPersistence).catch(() => setPersistence(getAuthInstance(), indexedDBLocalPersistence));
      } catch (_) {}
      onAuthStateChanged(getAuthInstance(), (user) => {
        console.log("Auth state:", user ? (user.isAnonymous ? "anonymous" : "signed-in") : "signed-out");
      });
    }

  } catch (error) {
    console.error("Firebase initialization error:", error);
    // Do not throw to avoid blocking UI; callable may still work if allowed
  }
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function ensureAuth(timeoutMs = 4000): Promise<User | null> {
  if (!auth) auth = getAuth(app);
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (auth?.currentUser) return auth.currentUser;
    await sleep(200);
  }
  return auth?.currentUser ?? null;
}

async function withRetry<T>(fn: () => Promise<T>, tries = 3, baseDelay = 300): Promise<T> {
  let lastErr: any;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      const delay = baseDelay * Math.pow(2, i);
      console.warn(`retry ${i + 1}/${tries} failed, waiting ${delay}ms`, e);
      await sleep(delay);
    }
  }
  throw lastErr;
}

/**
 * Test App Check connectivity by calling appcheckPing function
 */
export async function testAppCheckConnection(): Promise<any> {
  try {
    // Ensure Firebase (functions/auth) is initialized
    initializeFirebaseAppCheck();
  if (!auth) auth = getAuth(app);
    try { await ensureAppCheckReady(); } catch {}
    const user = await ensureAuth();
    console.log("ensureAuth result:", !!user);

    console.log("Testing App Check connection...");

    // Call the appcheckPing function
    const appcheckPingFunction = httpsCallable(functions, "appcheckPing");
    const result = await withRetry(() => appcheckPingFunction());
    
    console.log("appcheckPing success:", result.data);
    return {
      success: true,
      data: result.data,
      message: "App Check connection successful"
    };

  } catch (error) {
    console.error("App Check test error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      message: "App Check connection failed"
    };
  }
}

/**
 * Call any Cloud Function with App Check protection
 */
export async function callCloudFunction(functionName: string, data?: any): Promise<any> {
  try {
    if (!functions) {
      initializeFirebaseAppCheck();
    }
    try { await ensureAppCheckReady(); } catch {}
    // 可能ならFirebase Authをサイレント確立
    await silentEnsureFirebaseAuth();

    const cloudFunction = httpsCallable(functions, functionName);
    const result = await cloudFunction(data);
    return result.data;

  } catch (error) {
    console.error(`Cloud function ${functionName} error:`, error);
    throw error;
  }
}

// ---------------- App Check Broker Integration ----------------
/**
 * -----------------------------------------------------------------
 * Modified by: roz
 * Date       : 2025-08-14
 * Changes    : HOSTING_ORIGIN moved to env var
 * Category   : 認証・AppCheck
 * -----------------------------------------------------------------
 */
const HOSTING_ORIGIN = (process.env.HOSTING_ORIGIN || "");
const RECAPTCHA_BROKER_PATH = "/recaptcha.html";

type AppCheckTokenLike = { token: string; expireTimeMillis: number };

async function getCachedAppCheckToken(): Promise<AppCheckTokenLike | null> {
  return new Promise((resolve) => {
    try {
      chrome.storage.local.get(['appcheck_token', 'appcheck_exp'], (r) => {
        const token = r?.appcheck_token as string | undefined;
        const exp = r?.appcheck_exp as number | undefined;
        if (token && exp && exp > Date.now()) resolve({ token, expireTimeMillis: exp });
        else resolve(null);
      });
    } catch { resolve(null); }
  });
}

async function cacheAppCheckToken(t: AppCheckTokenLike): Promise<void> {
  return new Promise((resolve) => {
    try { chrome.storage.local.set({ appcheck_token: t.token, appcheck_exp: t.expireTimeMillis }, () => resolve()); }
    catch { resolve(); }
  });
}

async function obtainAppCheckTokenFromBroker(timeoutMs = 20000): Promise<string> {
  // 1) Try postMessage flow via window.open (requires user gesture; preferred)
  if (isPageContext()) {
    try {
      const tokenViaWindow = await new Promise<string>((resolve, reject) => {
        const brokerUrl = HOSTING_ORIGIN + RECAPTCHA_BROKER_PATH;
        const onMessage = (ev: MessageEvent) => {
          try {
            if (ev.origin !== HOSTING_ORIGIN) return;
            const d = ev.data || {};
            if (d.type === 'APP_CHECK_TOKEN' && typeof d.token === 'string') {
              window.removeEventListener('message', onMessage);
              try { w?.close(); } catch {}
              resolve(d.token);
            }
          } catch {}
        };
        window.addEventListener('message', onMessage);
    const w = window.open(brokerUrl, '_blank', 'width=480,height=640');
        if (!w) {
          window.removeEventListener('message', onMessage);
          reject(new Error('Failed to open broker window'));
          return;
        }
        const t = setTimeout(() => {
          window.removeEventListener('message', onMessage);
          try { w.close(); } catch {}
          reject(new Error('App Check broker timeout'));
        }, timeoutMs);
      });
      if (tokenViaWindow) return tokenViaWindow;
    } catch (e) {
      // fallthrough to launchWebAuthFlow
    }
  }

  // 2) Fallback: use chrome.identity.launchWebAuthFlow with redirect back to extension
  const redirectUri = chrome.identity.getRedirectURL('appcheck');
  const url = `${HOSTING_ORIGIN}${RECAPTCHA_BROKER_PATH}?redirect_uri=${encodeURIComponent(redirectUri)}`;
  const responseUrl: string = await new Promise((resolve, reject) => {
    try {
      chrome.identity.launchWebAuthFlow({ url, interactive: true }, (retUrl) => {
        if (chrome.runtime.lastError || !retUrl) {
          reject(new Error(chrome.runtime.lastError?.message || 'launchWebAuthFlow failed'));
          return;
        }
        resolve(retUrl);
      });
    } catch (err) {
      reject(err);
    }
  });
  // Parse fragment: #appcheck_token=...
  try {
    const u = new URL(responseUrl);
    const hash = u.hash.startsWith('#') ? u.hash.substring(1) : u.hash;
    const params = new URLSearchParams(hash);
    const token = params.get('appcheck_token');
    if (!token) throw new Error('No appcheck_token in response');
    return token;
  } catch (e) {
    throw new Error('Failed to obtain App Check token via auth flow');
  }
}

async function initializeAppCheckViaBroker(): Promise<void> {
  if (appCheckInitialized) return;
  const cached = await getCachedAppCheckToken();
  const initialToken = cached?.token || await obtainAppCheckTokenFromBroker();
  const provider = new CustomProvider({
    getToken: async () => {
      const c = await getCachedAppCheckToken();
      if (c && c.expireTimeMillis - Date.now() > 30 * 1000) return c as any;
      const fresh = await obtainAppCheckTokenFromBroker();
      const obj = { token: fresh, expireTimeMillis: Date.now() + 5 * 60 * 1000 };
      await cacheAppCheckToken(obj);
      return obj as any;
    }
  });
  initializeAppCheck(app, { provider, isTokenAutoRefreshEnabled: true });
  appCheckInitialized = true;
  await cacheAppCheckToken({ token: initialToken, expireTimeMillis: Date.now() + 5 * 60 * 1000 });
}

async function ensureAppCheckReady(): Promise<void> {
  if (appCheckInitialized) return;
  if (appCheckInitInFlight) return appCheckInitInFlight;
  if (!isExtensionEnvironment() || !isPageContext()) return; // SWなどではスキップ
  appCheckInitInFlight = initializeAppCheckViaBroker().catch(() => {}).finally(() => { appCheckInitInFlight = null; });
  return appCheckInitInFlight;
}

async function silentEnsureFirebaseAuth(): Promise<void> {
  try {
    if (!auth) auth = getAuth(app);
    const u = auth?.currentUser;
    if (u && !u.isAnonymous) return;
    await new Promise<void>((resolve) => {
      chrome.storage.local.get(["google_auth_token"], async (r) => {
        const token = r?.google_auth_token as string | undefined;
        if (!token) return resolve();
        try {
          await signInWithCredential(getAuthInstance(), GoogleAuthProvider.credential(null, token));
          await getAuthInstance().currentUser?.getIdToken(true);
        } catch (_) {}
        resolve();
      });
    });
  } catch (_) {}
}

// ユーザー操作起点での明示的なApp Check準備（ポップアップブロック回避）
export async function prepareAppCheckForUserGesture(): Promise<void> {
  if (appCheckInitialized) return;
  if (!isExtensionEnvironment() || !isPageContext()) return;
  // キャッシュが有効なら起動のみ、無効ならこのタイミングでブローカーを開く
  const cached = await getCachedAppCheckToken();
  if (cached && cached.expireTimeMillis > Date.now() + 30 * 1000) {
    if (!appCheckInitialized) {
      // Providerを初期化
      const provider = new CustomProvider({
        getToken: async () => ({ token: cached.token, expireTimeMillis: cached.expireTimeMillis } as any)
      });
      initializeAppCheck(app, { provider, isTokenAutoRefreshEnabled: true });
      appCheckInitialized = true;
    }
    return;
  }
  // この関数はユーザー操作直後に呼ばれる想定：window.open 許可が維持される
  if (!appCheckInitInFlight) {
    appCheckInitInFlight = initializeAppCheckViaBroker().finally(() => { appCheckInitInFlight = null; });
  }
  await appCheckInitInFlight;
}

/**
 * 手動でApp Checkトークンを設定（ブローカページで取得した値を貼り付けて渡す用途）
 * - キャッシュに保存し、必要ならProviderを即時初期化
 */
export async function setAppCheckTokenManually(token: string, ttlMillis = 5 * 60 * 1000): Promise<void> {
  try {
    initializeFirebaseAppCheck();
    const exp = Date.now() + Math.max(30_000, ttlMillis);
    await cacheAppCheckToken({ token, expireTimeMillis: exp });

    // Providerが未初期化ならこのトークンで起動
    if (!appCheckInitialized && isExtensionEnvironment() && isPageContext()) {
      const provider = new CustomProvider({
        getToken: async () => ({ token, expireTimeMillis: exp } as any)
      });
      initializeAppCheck(app, { provider, isTokenAutoRefreshEnabled: true });
      appCheckInitialized = true;
    }
  } catch (e) {
    console.warn('setAppCheckTokenManually failed:', e);
    throw e;
  }
}

/**
 * Calendar Sync backend connectivity test via Cloud Functions
 * - Calls a lightweight ping function on the backend (expected name: "calendarSyncPing")
 * - Returns success flag and payload for UI display
 */
export async function testCalendarSyncBackend(): Promise<{
  success: boolean;
  data?: any;
  message: string;
  error?: string;
}> {
  try {
    initializeFirebaseAppCheck();
  if (!auth) auth = getAuth(app);
    const user = await ensureAuth();
    console.log("ensureAuth result:", !!user);

    // Call the available backend ping function (appcheckPing)
    const ping = httpsCallable(functions, "appcheckPing");
    const res = await withRetry(() => ping({ ts: Date.now() }));

    return {
      success: true,
      data: res.data,
      message: "Calendar Sync backend connectivity successful"
    };
  } catch (error) {
    console.error("Calendar Sync backend test error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      message: "Calendar Sync backend connectivity failed"
    };
  }
}

/**
 * Sign into Firebase using an existing Google OAuth access token.
 * - If current user is anonymous, try upgrading via link; fallback to direct sign-in.
 */
export async function signInFirebaseWithGoogleAccessToken(accessToken: string): Promise<User> {
  initializeFirebaseAppCheck();
  if (!auth) auth = getAuth(app);
  const credential = GoogleAuthProvider.credential(null, accessToken);

  try {
    if (auth.currentUser && auth.currentUser.isAnonymous) {
      try {
        const linkResult = await linkWithCredential(auth.currentUser, credential);
        // Force refresh ID token to ensure callable uses non-anonymous token
        await linkResult.user.getIdToken(true);
        return linkResult.user;
      } catch (linkErr) {
        console.warn("linkWithCredential failed, falling back to signInWithCredential", linkErr);
      }
    }
  const result = await signInWithCredential(getAuthInstance(), credential);
    // Force refresh ID token to ensure callable uses updated provider info
    await result.user.getIdToken(true);
    return result.user;
  } catch (error) {
    console.error("Firebase Google sign-in with accessToken failed:", error);
    // Fallback: acquire Google ID token via Web OAuth flow and sign in
    try {
      const loginHint = await getGoogleEmailFromAccessToken(accessToken).catch(() => undefined);
      const idToken = await getGoogleIdTokenViaWebAuthFlow(loginHint);
      // Use REST API signInWithIdp with id_token per spec
      const user = await signInFirebaseWithGoogleIdToken(idToken);
      await user.getIdToken(true);
      return user;
    } catch (fallbackErr) {
      console.error("Firebase sign-in fallback with id_token failed:", fallbackErr);
      throw error; // surface original error for clarity
    }
  }
}

/**
 * Sign in to Firebase using Google ID token via REST accounts:signInWithIdp
 */
export async function signInFirebaseWithGoogleIdToken(idToken: string): Promise<User> {
  initializeFirebaseAppCheck();
  if (!auth) auth = getAuth(app);
  const apiKey = (firebaseConfig as any).apiKey as string;
  const requestUri = chrome.identity.getRedirectURL('oauth2');
  const postBody = new URLSearchParams({ id_token: idToken, providerId: 'google.com' }).toString();
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=${encodeURIComponent(apiKey)}`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requestUri,
      postBody,
      returnSecureToken: true,
      returnIdpCredential: true
    })
  });
  if (!resp.ok) {
    let msg = `signInWithIdp failed: HTTP ${resp.status}`;
    try {
      const err = await resp.json();
      if (err?.error?.message) msg += ` - ${err.error.message}`;
      console.error('signInWithIdp error payload:', err);
    } catch {}
    throw new Error(msg);
  }
  const data = await resp.json();
  const idTokenResp = data.idToken as string | undefined;
  const refreshToken = data.refreshToken as string | undefined;
  if (!idTokenResp) throw new Error('signInWithIdp: missing idToken in response');
  // Use SDK to update current user with received ID token by calling signInWithCredential
  const cred = GoogleAuthProvider.credential(idTokenResp);
  const res = await signInWithCredential(getAuthInstance(), cred);
  await res.user.getIdToken(true);
  return res.user;
}

async function getGoogleEmailFromAccessToken(accessToken: string): Promise<string | undefined> {
  const resp = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!resp.ok) return undefined;
  const data = await resp.json();
  return data?.email;
}

async function getGoogleIdTokenViaWebAuthFlow(loginHint?: string): Promise<string> {
  if (!WEB_OAUTH_CLIENT_ID) throw new Error('WEB_OAUTH_CLIENT_ID not configured');
  const redirectUri = chrome.identity.getRedirectURL('oauth2');
  const nonce = generateNonce();
  const params = new URLSearchParams({
    client_id: WEB_OAUTH_CLIENT_ID,
    response_type: 'id_token',
    redirect_uri: redirectUri,
    scope: 'openid email profile',
    prompt: 'consent',
    nonce
  });
  if (loginHint) params.set('login_hint', loginHint);
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  const responseUrl = await new Promise<string>((resolve, reject) => {
    chrome.identity.launchWebAuthFlow({ url: authUrl, interactive: true }, (url) => {
      if (chrome.runtime.lastError || !url) {
        reject(new Error(chrome.runtime.lastError?.message || 'launchWebAuthFlow failed'));
        return;
      }
      resolve(url);
    });
  });
  const url = new URL(responseUrl);
  const hash = url.hash.startsWith('#') ? url.hash.substring(1) : url.hash;
  const frag = new URLSearchParams(hash);
  const idToken = frag.get('id_token');
  if (!idToken) throw new Error('No id_token in response');
  return idToken;
}

function generateNonce(length = 32): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

/** Get current Firebase user (if any). */
export function getCurrentFirebaseUser(): User | null {
  if (!auth) return null;
  return auth.currentUser;
}

/** Sign out from Firebase Auth (does not affect Google OAuth token in Chrome). */
export async function signOutFirebase(): Promise<void> {
  try {
  if (!auth) auth = getAuth(app);
  await signOut(getAuthInstance());
  } catch (e) {
    console.warn("Firebase signOut warning:", e);
  }
}
