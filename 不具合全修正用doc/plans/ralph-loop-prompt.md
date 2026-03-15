# ralph-loop 実装プロンプト

## 使い方

```bash
/ralph-loop 不具合全修正用doc/plans/実装進捗.md の未完了タスクを上から順に実装する。各タスクは不具合全修正用doc/修正事項/の該当ファイルを参照し、Codex CLIに委任して実装する。1タスク完了ごとに実装進捗.mdのチェックボックスを更新する。フェーズ末尾でnpm run build:chromeを実行して検証する。全タスク完了で終了。 --max-iterations 30 --completion-promise 'ALL_BUGS_FIXED'
```

## オーケストレーターの動作仕様

各イテレーションで:

1. `不具合全修正用doc/plans/実装進捗.md` を読み、次の未完了タスクを特定
2. 該当する `不具合全修正用doc/修正事項/XX_*.md` を読み、修正詳細を確認
3. Codex CLI エージェントにタスクを委任（`--codex` フラグまたは `claude-code-harness:codex-implementer`）
4. Codex の実装結果を確認し、`実装進捗.md` のチェックボックスを `[x]` に更新
5. フェーズ最終タスク後に `npm run build:chrome` と `npm test` を実行
6. 全タスク完了時に `ALL_BUGS_FIXED` を出力してループ終了

## Codex への委任テンプレート

```
タスクN-M: [タスク名]

修正対象BUG: [BUG-ID]
修正内容: [修正事項mdからの詳細]
対象ファイル: [ファイルパス]
変更方針: [具体的な変更内容]

制約:
- 既存の機能を壊さないこと
- TypeScript strict モードに準拠
- 不要なリファクタリングをしない
- 修正箇所のみ変更する
```

## 注意事項

- タスク4-1（統一ロガー）は影響範囲が広いため、他タスクとの競合に注意
- タスク2-3（ストレージキュー統一）は calendarSync.ts と background.ts の広範囲に影響
- タスク4-5（folder-ui リファクタリング）は任意。他タスクが全て完了してから判断
- BUG-09-01（localStorage/chrome.storage混在）はフェーズ4以降に別計画で対応を推奨（影響範囲大）
