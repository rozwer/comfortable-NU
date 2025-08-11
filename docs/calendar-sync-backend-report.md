# カレンダー同期のバックエンド連携・既存コード調査レポート

- 作成日: 2025-08-11
- 対象リポジトリ: comfortable-sakai（Chrome拡張）
- 調査目的: `./calender-sync` バックエンド呼び出しの可否と、旧カレンダー同期実装の残置状況を確認

## 結論サマリ
- バックエンド（Cloud Functions 等）経由の「カレンダー同期」呼び出しは、現状の拡張機能コード上で確認できませんでした。
  - Firebase App Check 初期化コードや Cloud Functions の疎通テストは存在しますが、同期処理自体は呼び出していません。
- 旧来の「拡張機能（クライアント）→ Google Calendar API 直接呼び出し」による同期実装が稼働しています。
  - `background.ts`（ビルド後は `background.js`）で Google OAuth（`chrome.identity`）と Calendar API への `fetch` を直接実行しています。

## 呼び出し経路（現状）
- UI/実行トリガ: `src/calendarSync.ts`（同期モーダルや「同期開始」操作、アカウント取得・認証誘導）
  - `authenticateGoogle()` → `chrome.runtime.sendMessage('authenticateGoogle')`
  - `syncToCalendar(assignments, quizzes, token?)` → `chrome.runtime.sendMessage('syncToCalendar', { data, token })`
- バックグラウンド: `src/background.ts`（サービスワーカー）
  - `onMessage` の `syncToCalendar` ハンドラで、Google OAuth トークンを用いて直接 Google Calendar API を呼び出し
  - 主要関数
    - `authenticateGoogle()`：`chrome.identity.getAuthToken` によるトークン取得
    - `syncToCalendar(data, token)`：課題・クイズをイベント化してループ処理
    - `createCalendarEvent(item, type, token)`：`https://www.googleapis.com/calendar/v3/calendars/primary/events` へ `fetch`
- 自動同期: `src/content_script.ts`
  - `setupAutoSyncCheck()` → アラーム発火や条件が整ったときに `syncToCalendar` メッセージを送信

以上より、拡張機能はクライアントサイドで OAuth し、そのトークンで Google Calendar API を直接叩いています（バックエンド仲介なし）。

## バックエンド連携の痕跡（未使用）
- Firebase/App Check 初期化と動作確認
  - `src/firebase-appcheck.ts`
    - `initializeFirebaseAppCheck()`：Firebase App と App Check, Functions の初期化
    - `testAppCheckConnection()`：`httpsCallable(functions, "appcheckPing")` を呼ぶ疎通テスト
    - `callCloudFunction(functionName, data)`：任意の Functions 呼び出しラッパ（現状未使用）
  - `src/subsakai.tsx`
    - ボタンから `testAppCheckConnection()` を叩いて結果を表示（同期処理とは独立）
- マニフェストの権限
  - `manifest.json` の `host_permissions` に `https://asia-northeast1-comfortablenu.cloudfunctions.net/*` が含まれる
  - ただし、当該ドメインを実際に叩くコードは同期経路には存在しない
- 開発メモ
  - `.claude/settings.local.json` に外部パス（`/home/rozwer/sakai/calendar-sync/.../functions`）のビルドコマンド記載あり
  - リポジトリ内に `./calender-sync`（綴り含め）というディレクトリは見つかりませんでした

## 旧実装（クライアント直叩き）の主な残存箇所
- `src/background.ts`
  - `authenticateGoogle` / `verifyTokenSecurity` / `getGoogleAccounts`
  - `syncToCalendar` / `createCalendarEvent`（Google Calendar API 直接 `fetch`）
  - `chrome.alarms` を用いた自動同期アラーム管理
- `src/calendarSync.ts`
  - 同期モーダル UI、`sendMessage('syncToCalendar')` によるバックグラウンド呼び出し
- ビルド成果物
  - ルート直下の `background.js` を `manifest.json` のサービスワーカーとして使用
- 付記（重複し得るソース）
  - `src` 配下に `*.ts` と `*.js` が並存（例: `calendarSync.ts` と `calendarSync.js`）。現状はビルド設定に依存しますが、メンテ性の観点では不要な `.js` は整理するのが無難です。

## 影響・リスク
- バックエンド呼び出しに移行したつもりであっても、現状はクライアントから直接 Calendar API を叩いているため、
  - App Check によるボット対策やレート管理、鍵の秘匿といった「サーバ側の統制」を活かせていません。
  - 拡張機能側の OAuth 設定・権限（scopes）も引き続き必要です。
- 二重実装による重複登録は現状は発生していません（バックエンド経路が呼ばれていないため）。ただし、将来的にバックエンド経路を導入する際は排他・重複防止設計（イベントキー管理等）の見直しが必要です。

## 移行のための最小変更案（参考）
- バックエンド（Cloud Functions）を前提とする場合：
  - `src/background.ts` の `syncToCalendar`（および `createCalendarEvent`）の実体を、`src/firebase-appcheck.ts` の `callCloudFunction("calendarSync", payload)` に置換
    - payload 例：`{ assignments, quizzes, appCheckToken?, oauthToken? }`
    - App Check 強制を Functions 側で有効化した上で、拡張側は `initializeFirebaseAppCheck()` を同期実行前に一度だけ呼び出し
  - あるいは UI 層（`src/calendarSync.ts`）から直接 Cloud Functions を呼ぶ方式に切り替え、`background.ts` を細く保つ
  - 移行完了後に `background.ts` 内の Google API 直呼びロジックを削除し、`manifest.json` の OAuth スコープも再検討

## 調査ログ（要点）
- バックエンド URL / Cloud Functions 呼び出しコードなし（検索）
  - `asia-northeast1-comfortablenu.cloudfunctions.net`・`cloudfunctions.net`・`httpsCallable` は、同期経路では未使用
- Google Calendar API 直接呼び出しの痕跡
  - `src/background.ts`：`fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', { ... })` が存在
- Firebase/App Check の存在
  - `src/firebase-appcheck.ts` に初期化・疎通テストあり（未配線）

---
本レポートは、リポジトリの現行コード（`src/` とビルド成果物、`manifest.json`）を対象に、ファイル参照・全文検索に基づいて作成しました。追加のリポジトリ（例: `./calender-sync`）や別ディレクトリにあるバックエンド実装が存在する場合は、その配置と拡張機能からの呼び出しパスを共有いただければ、再調査のうえで更新します。
