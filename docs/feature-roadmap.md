# 新機能 実装仕様

TACT API の既存エンドポイントと拡張機能の基盤を活用して実装する機能仕様。

## 共通方針

- **UI 配置**: 時間割ボタン・カレンダー同期ボタンと同じ Sakai ヘッダー領域にボタンを追加し、各機能はモーダルで表示する
- **通知方式**: OS 通知（`chrome.notifications`）は使わず、バッジ方式（`cs-notification-badge` 相当）で表示する
- **データ取得**: 既存の `fetchCourse()` / `getEntities()` で全コースを列挙し、各 API を並列に叩く

---

## 1. 課題の横断ダッシュボード（週次ビュー）

全コースの課題・小テストを週単位のガントチャート風に表示する。

### 機能要件

- ヘッダーにダッシュボードボタンを追加し、クリックでモーダルを開く
- 横軸: 月〜日（1 週間）、縦軸: 課題名
- `openTime` 〜 `dueTime` の期間を横バーで表示する
- 色分け: 未提出（赤系）/ 提出済み（緑系）/ 小テスト（青系）
- 週の切替（前週・次週）ができること
- 課題名クリックで該当コースページへ遷移すること

### 利用 API

- Assignment API（全コース）: `dueTime`, `openTime`, `closeTime`, `title`, `submissions`
- Quiz API（全コース）: `dueDate`, `title`

### 流用可能な既存コード

- `timetable.ts` の曜日×時限グリッド描画
- `getEntities()` の全コース取得ロジック

---

## 2. 新着ファイル検知

講義資料が追加・更新されたことをバッジで通知する。

### 機能要件

- Content API の `modifiedTime` / `createdTime` を前回取得分と比較する
- 新着がある教科のサイドバーにバッジ（`cs-notification-badge` 相当）を付ける
- バッジクリック or 該当フォルダ閲覧でバッジを消す
- 前回取得分は `chrome.storage.local` に保存し、差分検出する
- background.ts のアラーム機構で定期チェック（設定で間隔変更可能）

### 利用 API

- Content API: `modifiedTime`, `createdTime`, `title`, `type`

### 保存要件

- `chrome.storage.local[hostname]["fileCheckedTimestamps"]`: コース別の最終チェック時刻
- `chrome.storage.local[hostname]["newFileFlags"]`: コース別の新着フラグ

### 流用可能な既存コード

- `file-storage.ts` のノード永続化
- `favoritesBar.ts` の `cs-notification-badge` 付与ロジック

---

## 3. お知らせの全コース横断タイムライン

全講義のお知らせを時系列で一覧表示する。

### 機能要件

- ヘッダーにお知らせボタンを追加し、クリックでモーダルを開く
- 全コースの Announcement API を並列に叩き、`createdOn` で時系列ソート
- 各お知らせ: コース名・タイトル・日時・本文プレビュー（折りたたみ展開）
- 新着（前回表示以降）にはバッジを付ける
- コース名でのフィルタ機能
- 既読管理: 開いたお知らせは既読にする

### 利用 API

- Announcement API（全コース）: `title`, `body`, `createdOn`, `announcementId`, `siteId`

### 保存要件

- `chrome.storage.local[hostname]["announcementLastSeen"]`: 最終閲覧時刻
- `chrome.storage.local[hostname]["readAnnouncements"]`: 既読お知らせ ID リスト

### 流用可能な既存コード

- miniSakai のタブ構造
- `folder-ui.ts` のお知らせ描画ロジック

---

## 4. 学習負荷の可視化

今後数週間の課題・小テスト数をヒートマップで表示する。

### 機能要件

- ヘッダーに負荷ビューボタンを追加し、クリックでモーダルを開く
- カレンダー型ヒートマップ: 日ごとの締切数を色の濃さで表現
- 日付セルホバーで詳細表示（「課題 3 件、小テスト 1 件」など）
- 表示期間: 今日から 4 週間先
- 週ごとの合計件数も表示

### 利用 API

- Assignment API（全コース）: `dueTime`
- Quiz API（全コース）: `dueDate`

### 流用可能な既存コード

- `getEntities()` の全コース一括取得
- `timetable.ts` のカレンダー描画基盤

---

## 5. 提出率トラッカー

コースごとの課題提出率を可視化する。

### 機能要件

- ヘッダーに提出率ボタンを追加し、クリックでモーダルを開く
- コースごとの提出率を横棒グラフで表示（提出済み / 未提出 / 合計）
- 全体の提出率サマリーも表示
- 未提出課題の一覧を展開表示可能

### 利用 API

- Assignment API（全コース）: `submissions`, `title`, `dueTime`

### 流用可能な既存コード

- `getAssignments()` の全コース取得
- `decodeAssignmentFromAPI()` の提出状態判定

---

## 6. 全教科横断フォルダブラウザ

全教科のファイルを階層的に閲覧・検索できるルートフォルダを提供する。

### 機能要件

- ヘッダーにフォルダボタンを追加し、クリックでモーダルを開く
- フォルダ構造: `/{学期+季節}/{教科名}/...`（例: `2025春/線形代数/第1回/資料.pdf`）
- ルートから全教科のファイルツリーを一望できる
- 学期・季節による自動分類（TACT のコース情報から学期を判定）
- **検索機能**: ファイル名・フォルダ名でインクリメンタル検索
  - 検索結果はフラットリスト表示（パスを表示）
  - 検索ヒット箇所をハイライト
- フォルダ開閉、ファイル個別リンク、選択一括ダウンロードは既存フォルダタブの機能を流用
- 新着ファイルには「NEW」バッジを表示（機能 2 の新着検知と連動）

### 利用 API

- Content API（全コース）: `content_collection` 全体
- Course API: 学期・季節情報の取得

### 保存要件

- `localStorage["cross-folder-cache"]`: 全教科統合ツリーのキャッシュ
- `localStorage["cross-folder-cache-time"]`: キャッシュ生成時刻
- 各教科のファイルツリーは既存の `localStorage["tact-file-system-${siteId}"]` を流用

### 流用可能な既存コード

- `folder-ui.ts` のツリー描画・フォルダ開閉・ファイル選択・一括ダウンロード
- `file-storage.ts` のノード管理
- `jszip-loader.ts` の ZIP 生成

---

## UI 配置まとめ

Sakai ヘッダー拡張のボタン群:

```
[ miniSakai ] [ 時間割 ] [ カレンダー同期 ] [ ダッシュボード ] [ お知らせ ] [ 負荷 ] [ 提出率 ] [ フォルダ ]
```

各ボタンは既存の `miniSakai`・`時間割`・`カレンダー同期` ボタンと同じスタイルで統一する。
