// Authentication troubleshooting script
// Run this in Chrome DevTools Console to clear all authentication data

console.log('🧹 Clearing all authentication data...');

// Clear Chrome Identity cached tokens
chrome.identity.getAuthToken({interactive: false}, (token) => {
  if (token) {
    console.log('🗑️ Removing cached token:', token.substring(0, 10) + '...');
    chrome.identity.removeCachedAuthToken({token: token}, () => {
      console.log('✅ Cached token removed');
    });
  } else {
    console.log('ℹ️ No cached token found');
  }
});

// Clear extension storage
chrome.storage.local.clear(() => {
  console.log('✅ Extension storage cleared');
});

// Clear sync storage as well
chrome.storage.sync.clear(() => {
  console.log('✅ Sync storage cleared');
});

console.log('🔄 Please reload the extension after running this script');
