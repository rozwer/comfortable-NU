# 機能展望ロードマップ

TACT API の既存エンドポイントと拡張機能の基盤を活用して実現可能な機能案。

---

## 1. 課題の横断ダッシュボード（週次ビュー）

Assignment API は全コースを `fetchCourse()` で列挙して並列に叩ける。
`dueTime` と `openTime` を組み合わせれば、**今週やるべきことを時間割のようなガントチャートで表示**できる。

- **利用 API:** Assignment API（全コース）
- **利用フィールド:** `dueTime`, `openTime`, `closeTime`, `title`
- **流用可能な既存コード:** `timetable.ts` の曜日×時限グリッド描画、`getEntities()` の全コース取得ロジック

---

## 2. 提出忘れアラート（プッシュ通知）

`submissions` フィールドで提出済み/未提出が判定できる。
`dueTime` が近いのに未提出の課題を検出し、`chrome.notifications` で通知する。

- **利用 API:** Assignment API
- **利用フィールド:** `submissions`, `dueTime`, `title`
- **流用可能な既存コード:** `background.ts` の `chrome.alarms` 基盤、`decodeAssignmentFromAPI()` の提出状態判定ロジック

---

## 3. 新着ファイル検知

Content API の `modifiedTime` / `createdTime` を前回取得分と比較し、
**講義資料が追加・更新されたタイミング**を検出して通知する。

- **利用 API:** Content API
- **利用フィールド:** `modifiedTime`, `createdTime`, `title`, `type`
- **流用可能な既存コード:** `file-storage.ts` のノード永続化（前回取得分との差分比較が容易）、`chrome.notifications`

---

## 4. お知らせの全コース横断タイムライン

Announcement API はコース単位だが、`fetchCourse()` で全コースを列挙して並列に叩けば、
**全講義のお知らせを時系列で一覧表示**できる。

- **利用 API:** Announcement API（全コース）
- **利用フィールド:** `title`, `body`, `createdOn`, `announcementId`
- **流用可能な既存コード:** miniSakai のタブ構造（「お知らせ」タブを追加）、`folder-ui.ts` のお知らせ描画ロジック

---

## 5. 課題添付ファイルの一括ダウンロード

Assignment API の `attachments` にファイル URL が含まれている。
**課題の添付資料（問題文 PDF 等）をまとめて ZIP ダウンロード**できる。

- **利用 API:** Assignment API
- **利用フィールド:** `attachments[].url`, `attachments[].name`, `attachments[].size`
- **流用可能な既存コード:** `folder-ui.ts` の `downloadSelectedFiles()` + `jszip-loader.ts`

---

## 6. 学習負荷の可視化

全コースの Assignment + Quiz の `dueTime` を集計して、
**「来週は課題 5 件 + 小テスト 2 件で忙しい」** のようなヒートマップや負荷グラフを描画する。

- **利用 API:** Assignment API + Quiz API（全コース）
- **利用フィールド:** `dueTime`（Assignment）, `dueDate`（Quiz）
- **流用可能な既存コード:** `getEntities()` の全コース一括取得、`timetable.ts` のカレンダー描画基盤

---

## 7. 提出率トラッカー

Assignment API の `submissions` の有無をコースごとに集計し、
**コースごとの自分の提出率**を円グラフで表示する。

- **利用 API:** Assignment API（全コース）
- **利用フィールド:** `submissions`, `title`（コースごとに集計）
- **流用可能な既存コード:** `getAssignments()` の全コース取得、`decodeAssignmentFromAPI()` の提出状態判定
