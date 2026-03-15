# 08_TACTフォルダタブ 修正事項

## 不具合（コード調査で確認済み）

### BUG-08-01: 課題詳細API失敗時にモックデータ表示 [HIGH]
- **場所**: `src/features/tact/folder-ui.ts` L1611
- **内容**: `getAssignmentDetail()` でAPI失敗時に `getMockAssignmentData()` でハードコードされたモックデータを返す。ユーザーに実データと区別なく表示される
- **対応**: モックフォールバックを削除し、「データを取得できませんでした」エラー表示に変更

### BUG-08-02: タブ切替時のイベントリスナー重複 [MEDIUM]
- **場所**: `src/features/tact/folder-ui.ts` L970-972
- **内容**: `switchTab()` → `render()` → `addTabSwitchListeners()` の連鎖で、タブ切替のたびに新しいリスナーが追加される。古いリスナーのクリーンアップなし
- **対応**: イベント委任パターンに変更するか、再登録前にリスナー解除

### BUG-08-03: ZIP生成のメモリ制限なし [MEDIUM]
- **場所**: `src/features/tact/folder-ui.ts` L432-520
- **内容**: 全ファイルをメモリにバッファしてからZIP生成。ファイル数・サイズに上限なし。50ファイル以上でブラウザメモリ問題のリスク
- **対応**: ファイル数警告の追加、または段階的ダウンロード

### BUG-08-04: NUSS URL判定が単純な部分一致 [LOW]
- **場所**: `src/features/tact/tact-api.ts` L414-416
- **内容**: `url.includes('nuss.nagoy')` で判定。`fake-nuss.nagoya.jp` 等の誤一致リスク
- **対応**: より厳密なURLパターンマッチ（ドメイン部分の完全一致）

## 検証済み（修正済みまたは問題なし）

- ✅ loadFromStorage のデータバリデーション: 型チェック・フィルタリング実装済み
- ✅ saveToStorage の QuotaExceededError: キャッチ・ロールバック実装済み
- ✅ NUSS ファイルのフォールバック: 複数段階のフォールバック実装（ただし最終手段はユーザー手動）
- ✅ 編集モード: 状態管理は整理済み

## 未実装要件

| ID | 内容 | 優先度 |
|----|------|--------|
| FEAT-08-01 | 取得中表示と失敗時表示の統一 | MEDIUM |
| FEAT-08-02 | 共通フィルタと検索 | LOW |
| FEAT-08-03 | API型定義の整理 | LOW |
| FEAT-08-04 | キャッシュ戦略の統一 | MEDIUM |
| FEAT-08-05 | 編集モード切替UI | LOW |
