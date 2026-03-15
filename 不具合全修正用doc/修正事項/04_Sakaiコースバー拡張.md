# 04_Sakaiコースバー拡張 修正事項

## 不具合（コード調査で確認済み）

### BUG-04-01: お気に入り取得のXHRにエラーハンドラなし [HIGH]
- **場所**: `src/features/favorite/index.ts` L57-94
- **内容**: `XMLHttpRequest` に `addEventListener("load")` のみで、`"error"` / `"timeout"` リスナーなし。ネットワーク障害時にPromiseがハングする
- **対応**: `onerror`, `ontimeout` ハンドラを追加し、Promiseをrejectする

### BUG-04-02: componentDidUpdateでのcatch不足 [MEDIUM]
- **場所**: `src/components/main.tsx` L405-408
- **内容**: お気に入り取得の `.then()` に `.catch()` がない。取得失敗時にUnhandled Promise Rejectionが発生
- **対応**: `.catch()` でエラーハンドリング追加

## 検証済み（問題なし）

- ✅ 色分けロジック: 8段階のDueCategoryが正しくCSSクラスにマッピング
- ✅ submitted/unpublished/hidden の色反映: 正しくskip/default処理
- ✅ 重複挿入防止: `.find()` チェックで既存URLをスキップ

## 未実装要件

| ID | 内容 | 優先度 |
|----|------|--------|
| FEAT-04-01 | 色分けルールの説明表示 | LOW |
| FEAT-04-02 | 通知バッジの凡例表示 | LOW |
| FEAT-04-03 | コースバー側からのフィルタやソート | LOW |
