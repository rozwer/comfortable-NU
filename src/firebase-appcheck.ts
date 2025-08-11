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
      error: error.message || String(error),
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