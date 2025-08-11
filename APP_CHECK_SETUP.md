# App Check 統合完了 - セットアップ手順

## 🎯 実装完了項目

### ✅ 1. Manifest 権限追加
`manifest.json` に Functions エンドポイントへのアクセス権限を追加しました：
```json
"https://asia-northeast1-comfortablenu.cloudfunctions.net/*"
```

### ✅ 2. Firebase 設定ファイル
`src/firebase-config.ts` を作成：
- プロジェクト設定 (`comfortablenu`)
- App Check サイトキー (要更新)
- Functions リージョン設定

### ✅ 3. App Check 統合モジュール
`src/firebase-appcheck.ts` を作成：
- Firebase App 初期化
- App Check 初期化 (ReCaptchaEnterpriseProvider)
- `appcheckPing` テスト関数
- 汎用 Cloud Functions 呼び出し関数

### ✅ 4. UI 統合
`public/subsakai.html` と `src/subsakai.tsx` を更新：
- App Check テストボタン追加
- テスト結果表示エリア追加
- イベントハンドラー実装

## 🔧 次に必要な設定

### 1. App Check サイトキーの取得
Firebase Console で Chrome 拡張機能用の App Check を設定し、サイトキーを取得してください：

1. Firebase Console → プロジェクト設定 → App Check
2. アプリを追加 → Web アプリ → Chrome Extension
3. 拡張機能 ID: `adajbdapblogpigfidemhaddanpodbij`
4. 生成されたサイトキーを `src/firebase-config.ts` の `APP_CHECK_SITE_KEY` に設定

### 2. 設定更新箇所
`src/firebase-config.ts` の以下を更新：
```typescript
// 実際のサイトキーに置き換え
export const APP_CHECK_SITE_KEY = "実際のサイトキーをここに";
```

## 🧪 テスト手順

1. **拡張機能をリロード**
   ```bash
   chrome://extensions
   # 「再読み込み」ボタンをクリック
   ```

2. **拡張機能を開く**
   - 拡張機能アイコンをクリック
   - popup 画面の「🔧 App Check テスト」セクションを確認

3. **App Check テストを実行**
   - 「AppCheck ↔ Functions テスト」ボタンをクリック
   - テスト結果を確認

## 📋 期待される動作

### 成功時
```
✅ App Check connection successful
レスポンス: {
  "ok": true,
  "uid": null,
  "ts": 1234567890123,
  "message": "App Check疎通確認成功"
}
```

### エラー時の主なパターン
- **App Check サイトキー未設定**: "Invalid site key"
- **Functions 権限不足**: "Network error"
- **App Check 設定ミス**: "App Check verification failed"

## 🔍 デバッグ方法

1. **DevTools Console を確認**
   ```javascript
   // Chrome DevTools → Console タブ
   // Firebase 関連のログを確認
   ```

2. **Network タブで確認**
   - Functions への通信状況
   - App Check トークンの送信状況

3. **Functions ログ確認**
   ```bash
   # Firebase CLI でログ確認
   firebase functions:log --project comfortablenu
   ```

## 📝 今後の拡張

この実装により以下が可能になりました：
- 既存の `addCalendarEvent`、`syncSakaiToCalendar` を `callCloudFunction()` で呼び出し可能
- App Check 保護下での安全な通信
- 他の Cloud Functions の追加統合

## ⚠️ 注意事項

- サイトキー設定後は本番環境での動作確認が必要
- App Check は本番環境でのみ完全に動作します（開発時は制限あり）
- 拡張機能の更新後は必ずリロードしてください