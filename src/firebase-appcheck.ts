/**
 * Firebase App Check integration for Chrome Extension
 * Secure communication with Cloud Functions
 */

import { initializeApp, getApps } from "firebase/app";
import { initializeAppCheck, ReCaptchaEnterpriseProvider, getToken } from "firebase/app-check";
import { getFunctions, httpsCallable, Functions } from "firebase/functions";
import { firebaseConfig, APP_CHECK_SITE_KEY, FUNCTIONS_REGION } from "./firebase-config";

let app: any;
let appCheck: any;
let functions: Functions;

/**
 * Initialize Firebase App and App Check (only once)
 */
export function initializeFirebaseAppCheck(): void {
  try {
    // Prevent multiple initializations
    if (getApps().length === 0) {
      app = initializeApp(firebaseConfig);
      console.log("Firebase app initialized");
    } else {
      app = getApps()[0];
      console.log("Using existing Firebase app");
    }

    // Initialize App Check
    if (!appCheck) {
      appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaEnterpriseProvider(APP_CHECK_SITE_KEY),
        isTokenAutoRefreshEnabled: true
      });
      console.log("Firebase App Check initialized");
    }

    // Initialize Functions
    if (!functions) {
      functions = getFunctions(app, FUNCTIONS_REGION);
      console.log(`Firebase Functions initialized for region: ${FUNCTIONS_REGION}`);
    }

  } catch (error) {
    console.error("Firebase initialization error:", error);
    throw error;
  }
}

/**
 * Test App Check connectivity by calling appcheckPing function
 */
export async function testAppCheckConnection(): Promise<any> {
  try {
    // Ensure Firebase is initialized
    if (!functions) {
      initializeFirebaseAppCheck();
    }

    console.log("Testing App Check connection...");
    
    // Get App Check token (for debugging)
    const token = await getToken(appCheck, false);
    console.log("App Check token obtained:", !!token);

    // Call the appcheckPing function
    const appcheckPingFunction = httpsCallable(functions, "appcheckPing");
    const result = await appcheckPingFunction();
    
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

    const cloudFunction = httpsCallable(functions, functionName);
    const result = await cloudFunction(data);
    return result.data;

  } catch (error) {
    console.error(`Cloud function ${functionName} error:`, error);
    throw error;
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
    if (!functions) {
      initializeFirebaseAppCheck();
    }

    // Obtain App Check token for debug visibility (Functions callable attaches it automatically)
    const token = await getToken(appCheck, false);
    console.log("App Check token (exists):", !!token);

    // Try to call the expected backend ping function
    const ping = httpsCallable(functions, "calendarSyncPing");
    const res = await ping({ ts: Date.now() });

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
