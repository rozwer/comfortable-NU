# 02_miniSakai 修正事項

## 不具合（コード調査で確認済み）

### BUG-02-01: イベントリスナーのメモリリーク [CRITICAL]
- **場所**: `src/components/main.tsx` L129-190
- **内容**: `componentDidMount` で `document.addEventListener('submittedTabClick', ...)` 等を登録するが、`componentWillUnmount` での解除が不完全。miniSakaiパネルの開閉でマウント/アンマウントが繰り返されるとリスナーが蓄積
- **対応**: `componentWillUnmount` で全リスナーを `removeEventListener` で解除。リスナー参照を保持すること

### BUG-02-02: Quizのsubmitted判定が常にfalse [CRITICAL]
- **場所**: `src/features/entity/quiz/types.ts`, `decode.ts`
- **内容**: QuizEntry に `submitted` プロパティが存在するが、decode時に Sakai API レスポンスから提出状態を判定するロジックがない。結果として提出済みクイズが課題一覧タブに残り続ける
- **対応**: クイズAPIレスポンスの提出判定ロジックを実装

### BUG-02-03: checkTimestamp のタイムゾーン問題 [MEDIUM]
- **場所**: `src/components/main.tsx` L223-249
- **内容**: `checkTimestamp` を `yyyy/mm/dd/hh` 形式で保存し、ローカル時刻で比較。タイムゾーンをまたぐ使用で非表示の開始/終了がずれる可能性
- **対応**: Unix timestamp への統一、またはタイムゾーン情報の付与

### BUG-02-04: getEntities() のPromiseにcatchなし [MEDIUM]
- **場所**: `src/components/main.tsx` L201-260
- **内容**: `reloadEntities()` 内の `getEntities().then(...)` に `.catch()` がない。APIエラー時にUnhandled Promise Rejectionが発生
- **対応**: `.catch()` でエラーハンドリングとUI表示

## 未実装要件

| ID | 内容 | 優先度 |
|----|------|--------|
| FEAT-02-01 | 初回ローディング表示 | MEDIUM |
| FEAT-02-02 | データ取得失敗時のエラー表示 | MEDIUM |
| FEAT-02-03 | 手動再読込ボタン | MEDIUM |
| FEAT-02-04 | タブ状態の永続化 | LOW |
| FEAT-02-05 | 一覧内の検索・絞り込み・並び替え | LOW |
| FEAT-02-06 | クイズ・メモの詳細表示充実 | LOW |
| FEAT-02-07 | 提出済みから通常一覧へ戻す導線 | LOW |
| FEAT-02-08 | 提出時刻・最終提出回数の表示 | LOW |
