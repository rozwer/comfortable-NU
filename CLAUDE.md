# Claude Code - プロジェクト設定情報

## Chrome拡張機能情報
- **拡張機能ID**: `adajbdapblogpigfidemhaddanpodbij`

## Firebase設定
- **プロジェクトID**: `comfortablenu`
- **プロジェクト番号**: `421126047790`

## ドメイン認証設定  
- **許可メールドメイン**: `@s.thers.ac.jp`（名古屋大学向け運用）

## Google Cloud設定
- **Chrome拡張機能クライアントID**: `320934121909-3mo570972bcc19chatsu8pcp6bevj7fm.apps.googleusercontent.com`

## バックエンド実装要件
- Firebase Cloud Functions
- Cloud Firestore 
- Firebase Authentication/Chrome Identity API
- Firebase App Check (DDoS対策)
- Firebase Hosting (ac.jp認証ページ)
- Google Calendar API連携

## セキュリティ要件
- ユーザー認証必須
- ドメイン所持確認 (@s.thers.ac.jp)
- レート制限: 1ユーザー/日1回
- App Check による正規拡張機能認証
- DDoS攻撃対策
