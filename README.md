# Comfortable Sakai

Sakai LMS（TACT など）をより快適に使うためのブラウザ拡張です。課題・小テスト・資料を見やすく整理し、コース横断のチェックやスケジュール連携をサポートします。


## 対応環境
- Sakai 20 / 21（主要機能を確認済み）
- TACT（名古屋大学）
- それ以外のバージョンは一部未検証

## インストール
- Chrome / Edge: Chrome ウェブストアからインストール
  - https://chromewebstore.google.com/detail/comfortable-nu/adajbdapblogpigfidemhaddanpodbij

※ Safari 版は現時点では提供していません。

## 主な機能（抜粋）
- 課題タブの強化: 期限に応じた色分け、再提出/遅延可のタグ表示、非公開課題の表示切替
- タブ拡張: 隠すタブ、提出済みタブ、自動振り分け
- 時間割ビュー: コースを時間割形式で一覧し各サイトへ移動
- Google カレンダー連携: TACT アクセス時に自動同期（設定により制御）
- メモ/資料管理: コースごとのメモ、外部リンク、資料のフォルダ表示と一括ダウンロード
- 通知バッジ: 未確認の新着課題を表示
- miniSakai: コース横断の課題/小テスト一覧、メモ課題の追加、チェックボックス管理
- キャッシュ: REST API 取得の間隔調整（既定: 課題2分・小テスト10分）

## ビルド（開発者向け）
```bash
npm install
export NODE_ENV=production
npm run build:all
```
出力は `dist/release/` に作成されます。各ブラウザごとのビルドは `npm run build:<browser>`（chrome|firefox|edge|safari）を参照してください。

## テスト
```bash
npm test
```

## プライバシーポリシー
当拡張のデータ取扱いは `PRIVACY_POLICY.md` を参照してください。

## ライセンス
Apache-2.0
