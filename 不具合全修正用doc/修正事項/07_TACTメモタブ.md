# 07_TACTメモタブ 修正事項

## 不具合（コード調査で確認済み）

### BUG-07-01: 講義名取得で空文字列チェック不足 [LOW]
- **場所**: `src/features/tact/memo.ts` L63-109
- **内容**: 4段階のフォールバック（`.Mrphs-hierarchy--siteName` → `.Mrphs-toolTitleNav__link--current` → `document.title` → lectureId）はあるが、空白文字列のチェックがなく、空白のみの講義名が返る可能性
- **対応**: 各フォールバックで `.trim()` 後に空チェック

### BUG-07-02: 検索の2文字制限がUI側のみ [MEDIUM]
- **場所**: `src/features/tact/memo.ts` L299-312, memo-ui.ts L255-258
- **内容**: `MemoManager.searchNotes()` にはバリデーションなし。UIの `memo-ui.ts` のみで `query.length < 2` チェック。直接呼び出しで空クエリ検索が可能
- **対応**: `searchNotes()` 内にもバリデーション追加

## 検証済み（問題なし）

- ✅ QuotaExceededError: `saveNote()`, `updateNote()` で正しくキャッチ
- ✅ 検索対象フィールド: note, lectureName, links[].title, links[].url, links[].description 全て対象
- ✅ リンククリック: 単一リンクは `window.open`、複数は選択ダイアログ

## 未実装要件

| ID | 内容 | 優先度 |
|----|------|--------|
| FEAT-07-01 | メモのエクスポート/インポート | LOW |
| FEAT-07-02 | タグ付け | LOW |
| FEAT-07-03 | 並び替え | LOW |
| FEAT-07-04 | リッチテキスト | LOW |
| FEAT-07-05 | 添付ファイル対応 | LOW |
