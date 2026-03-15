# Comfortable NU

名古屋大学 Sakai LMS (TACT) 向けブラウザ拡張機能。課題・小テスト管理、時間割、Google カレンダー連携などを提供。

## Tech Stack

- **Language**: TypeScript (strict mode, target ES5)
- **UI**: React 18
- **Bundler**: webpack 5 + ts-loader
- **Testing**: Jest + ts-jest
- **Lint/Format**: ESLint + Prettier
- **Platform**: Chrome Extension Manifest V3 (Firefox/Edge/Safari もサポート)

## Project Structure

```
src/
├── background.ts        # Service Worker (課題取得・キャッシュ・通知)
├── content_script.ts    # ページ注入スクリプト
├── calendarSync.ts      # Google カレンダー同期
├── minisakai.tsx         # miniSakai ポップアップ UI
├── subsakai.tsx          # サブ Sakai UI エントリ
├── constant.ts          # 定数定義
├── utils.ts             # ユーティリティ関数
├── components/          # React コンポーネント
├── features/            # 機能別モジュール
└── tests/               # テスト
```

## Commands

```bash
npm install              # 依存インストール
npm test                 # テスト実行
npm run build:chrome     # Chrome 向けビルド
npm run build:firefox    # Firefox 向けビルド
npm run build:all        # 全ブラウザビルド
```

## Conventions

- JSX: `"react"` モード (`tsconfig.json`)
- `@typescript-eslint/ban-ts-comment`: off
- `@typescript-eslint/no-namespace`: off
- コード・コメントは日本語/英語混在可
- webpack エントリポイント: `background`, `content_script`, `subsakai`
