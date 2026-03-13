# Comfortable NU - Legacy Code Audit: Remaining Tasks

This document lists issues identified during the legacy code audit that require
significant effort and should be addressed in dedicated sessions.

---

## 1. Safari Compatibility (CRITICAL)

### Problem
Safari builds will fail at runtime. The codebase uses Chrome-specific APIs
without any fallback or polyfill for Safari's Web Extension API.

### Chrome-only APIs used (no Safari equivalents)
- `chrome.identity.getAuthToken()` - Google OAuth (71+ instances in background.ts)
- `chrome.alarms.*` - Periodic sync scheduling
- `chrome.notifications.*` - Desktop notifications
- `chrome.tabs.query()` / `chrome.tabs.sendMessage()` - Tab communication

### Current Safari build handling
- `tasks/manifest-webpack-plugin.js` line 33: Uses `manifest-v2.json` for Safari
- Only changes `content_scripts[0].matches[0]` to `https://*/*`
- No API compatibility layer exists

### Recommended approach
1. Create a browser abstraction layer (`src/features/browser/index.ts`)
2. Implement `browser.ts` for Firefox/Safari using `browser.*` API
3. Implement `chrome.ts` for Chrome/Edge using `chrome.*` API
4. For Safari: disable calendar sync features gracefully (show "not supported" message)
5. Consider using `webextension-polyfill` npm package

### Affected files
- `src/background.ts` (entire file)
- `src/content_script.ts` (message passing)
- `src/features/chrome/index.ts`
- `tasks/manifest-webpack-plugin.js`

---

## 2. folder-ui.ts Refactoring (HIGH)

### Problem
`src/features/tact/folder-ui.ts` is 1972 lines with 40+ `any` types.
Too large for a single file, defeating the purpose of TypeScript's type safety.

### Recommended approach
1. Extract tab rendering into separate components
2. Create proper interfaces for API response types
3. Replace all `any` with typed interfaces
4. Split into: `folder-ui-tabs.ts`, `folder-ui-tree.ts`, `folder-ui-assignments.ts`

---

## 3. background.js Root File (MEDIUM)

### Problem
Root `background.js` (44KB) is a stale build artifact tracked in git.
`src/background.ts` is the source, webpack compiles to `dist/background.js`.

### Recommended action
- Delete `background.js` from repo root
- Add `/background.js` to `.gitignore`
- Verify no scripts reference the root file directly

---

## 4. Debug Console Statements (MEDIUM)

### Problem
221+ console.log/error statements throughout the codebase, including
emoji-prefixed debug logs (`[DEBUG]` tags) in production code.

### Affected files (major)
- `src/background.ts` - Extensive debug logging
- `src/content_script.ts` - Multiple debug statements
- `src/calendarSync.ts` - Debug logging

### Recommended approach
1. Create a logger utility with log levels (debug/info/warn/error)
2. Only output debug-level logs when `NODE_ENV !== 'production'`
3. Replace all `console.log('[DEBUG]...')` with `logger.debug(...)`

---

## 5. Unused npm dependency: mustache (LOW)

### Problem
`mustache` package is listed in `package.json` but not imported anywhere
in `src/`. This increases bundle size unnecessarily.

### Action
- Run `npm uninstall mustache` after verifying no usage in build scripts

---

## 6. i18n Unused Keys (LOW)

### Problem
`_locales/en/messages.json` and `_locales/ja/messages.json` contain
`tact_forum_*` keys that are no longer referenced in any source code
(the forum feature was removed with the dead index files).

### Action
- Remove unused `tact_forum_*` keys from both locale files

---

## 7. calendarSync.ts Type Safety (LOW)

### Problem
`src/calendarSync.ts` uses `any[]` for assignments and quizzes parameters
instead of typed interfaces.

### Action
- Replace `any[]` with `EntryProtocol[]` or `EntityProtocol[]`

---

## 8. test-cache-behavior.js (LOW)

### Problem
Root-level `test-cache-behavior.js` appears to be a standalone test/debug
script not integrated into the test suite.

### Action
- Evaluate if it should be moved to `src/tests/` or deleted

---

## Priority Order
1. Safari Compatibility (blocks Safari release)
2. folder-ui.ts Refactoring (code quality)
3. Debug Console Statements (production readiness)
4. background.js cleanup (repo hygiene)
5. Everything else (polish)
