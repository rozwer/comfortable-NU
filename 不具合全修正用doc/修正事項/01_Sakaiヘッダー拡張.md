# 01_Sakaiヘッダー拡張 修正事項

## 不具合（コード調査で確認済み）

### BUG-01-01: ボタン二重挿入防止なし [HIGH]
- **場所**: `src/minisakai.tsx` L41-110
- **内容**: `addMiniSakaiBtn()` は `topbar?.appendChild()` で無条件追加。DOM再描画やSPAナビゲーションで `main()` が再実行された場合、ボタンが重複挿入される
- **対応**: `topbar.contains(btn)` チェックを挿入前に追加

### BUG-01-02: ボタン挿入位置のフォールバックなし [MEDIUM]
- **場所**: `src/minisakai.tsx` L91
- **内容**: `document.getElementById("mastLogin")` のみで、取得失敗時は `optional chaining` で何も起きない。エラー通知もフォールバックもない
- **対応**: 代替セレクタ（`.Mrphs-mainHeader`, `nav.header` 等）を順番に試行

### BUG-01-03: ログイン判定がRegexベースで脆弱 [MEDIUM]
- **場所**: `src/utils.ts` L296-303
- **内容**: `isLoggedIn()` が `script.text.match("\"loggedIn\": true")` で判定。JSONフォーマット変更（スペース有無等）で検出失敗。コメント内一致で誤検出の可能性もある
- **対応**: JSON.parse ベースの判定に変更

### BUG-01-04: 非TACT画面でもボタン表示 [LOW]
- **場所**: `src/content_script.ts` L15-26
- **内容**: `isLoggedIn()` が true なら全Sakaiページでボタン表示。TACT固有機能（メモ・フォルダ）は `isTactPortal()` でゲートされているが、miniSakai/時間割/カレンダー同期ボタンはゲートなし
- **対応**: 表示条件の整理（意図的な設計なら要件ドキュメントを明確化）

## 未実装要件

| ID | 内容 | 優先度 |
|----|------|--------|
| FEAT-01-01 | ページ種別ごとの厳密な表示条件の整理 | MEDIUM |
| FEAT-01-02 | ボタン挿入位置のフォールバック | MEDIUM |
| FEAT-01-03 | 多重挿入防止の保証 | HIGH |
