# 03_subSakai 修正事項

## 不具合（コード調査で確認済み）

### BUG-03-01: hostname未保存時のサイレント失敗 [MEDIUM]
- **場所**: `src/subsakai.tsx` L10-13
- **内容**: `loadHostName()` が `undefined` を返した場合、`console.log("could not initialize subsakai")` のみでユーザーへのフィードバックなし。ポップアップが空白になる
- **対応**: 「TACTページを一度開いてください」等のメッセージをUI表示

## 未実装要件（ドキュメント上の未実装がコードで実装済みのもの）

以下はドキュメントでは未実装と記載されていたが、コード調査で **実装済み** と確認:
- タブ切替 → ✅ 実装済み（assignment, settings, submitted, dismissed）
- 設定表示 → ✅ 実装済み（SettingsTab）
- メモ追加 → ✅ 実装済み（AddMemoBox）
- 非表示操作 → ✅ 実装済み（DismissedEntryList, DatepickerModal）
- 提出済み操作 → ✅ 実装済み（SubmittedEntryList）

→ **ドキュメントの未実装要件セクションを更新する必要あり**

## 残存する未実装要件

| ID | 内容 | 優先度 |
|----|------|--------|
| FEAT-03-01 | hostname未保存時のUX改善 | MEDIUM |
| FEAT-03-02 | 読み取り専用であることのUI明示 | LOW |
