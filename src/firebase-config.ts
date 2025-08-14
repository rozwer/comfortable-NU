/**
 * -----------------------------------------------------------------
 * Modified by: roz
 * Date       : 2025-08-14
 * Changes    : Move Firebase config and App Check key to env vars
 * Category   : 設定・セキュリティ
 * -----------------------------------------------------------------
 */

// Firebase configuration for Comfortable NU Extension
// Values are injected at build time via webpack DefinePlugin
export const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || "",
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.FIREBASE_APP_ID || ""
  // measurementId is not required for this extension
};

// App Check site key for Chrome Extension (public, but configurable)
export const APP_CHECK_SITE_KEY = process.env.APP_CHECK_SITE_KEY || "";

// Functions region
export const FUNCTIONS_REGION = process.env.FUNCTIONS_REGION || "asia-northeast1";
