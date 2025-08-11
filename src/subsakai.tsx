import { loadHostName } from "./features/storage";
import { createRoot } from "react-dom/client";
import React from "react";
import { MiniSakaiRoot } from "./components/main";
import { initializeFirebaseAppCheck, testAppCheckConnection, testCalendarSyncBackend } from "./firebase-appcheck";

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

// Initialize and setup event listeners
initSubSakai();

// Setup App Check test button after DOM is ready
document.addEventListener("DOMContentLoaded", () => {
    const testButton = document.getElementById("btnAppCheckTest");
    if (testButton) {
        testButton.addEventListener("click", handleAppCheckTest);
        console.log("App Check test button initialized");
    }

    const calTestButton = document.getElementById("btnCalendarSyncTest");
    if (calTestButton) {
        calTestButton.addEventListener("click", handleCalendarSyncTest);
        console.log("Calendar Sync test button initialized");
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
}, 100);
