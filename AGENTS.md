# Repository Guidelines

## Project Structure & Module Organization
- Source: `src/` (TypeScript/React, features under `src/features/*`, UI in `src/components/`).
- Tests: `src/tests/` (`*.test.ts`, fixtures in `src/tests/resources/`, helpers in `src/tests/mock/`).
- Build configs: `tasks/` (per‑browser webpack configs and `release.js`).
- Assets/public: `public/`, localization `_locales/`.
- Output: `dist/source/<browser>/` and zipped releases in `dist/release/`.

## Build, Test, and Development Commands
- `npm install`: install dependencies.
- `npm run build:chrome|firefox|edge|safari`: build extension and write to `dist/source/<browser>/`, then package via `tasks/release.js`.
- `npm run build:all`: build for all browsers.
- `npm test`: run Jest (ts‑jest) tests under `src/tests/`.
- Versioning: use `npm version <patch|minor|major>`; the `version` script syncs `manifest*.json` and stages changes.

## Coding Style & Naming Conventions
- Language: TypeScript (+ React). Prefer `.ts/.tsx` over `.js` when touching code.
- Formatting: Prettier (4‑space indent, semicolons, print width 120). Run via editor or `npx prettier --check .`.
- Linting: ESLint with `@typescript-eslint`, React, and Prettier integration. Example: `npx eslint . --ext .ts,.tsx`.
- Naming: camelCase for variables/functions, PascalCase for React components, UPPER_SNAKE_CASE for constants. Filenames in this repo commonly use lowerCamelCase (e.g., `entryTab.tsx`).

## Testing Guidelines
- Framework: Jest with ts‑jest.
- Location/pattern: place tests in `src/tests/` named `*.test.ts`.
- Scope: add unit tests for utilities (`src/utils.ts`) and feature logic (`src/features/*`). Include minimal fixtures in `src/tests/resources/` when needed.
- Run: `npm test` locally before opening a PR.

## Commit & Pull Request Guidelines
- Commits: concise, imperative subject; keep one logical change per commit. English or Japanese is OK; reference issues when relevant.
- PRs: include a clear description, linked issues, and screenshots/GIFs for UI changes. Note impacted browsers (Chrome/Firefox/Edge/Safari).
- Checks: ensure `npm test` passes and at least one `build:<browser>` succeeds. Do not commit `dist/` outputs or secrets.
- Communication: 返信・レビューコメントは原則「日本語」で行ってください。

## Change Annotations in Code
- For any non-trivial change, add a header comment at the edited block (or top of file) with author, date, summary, and category.
- Use this exact format (Japanese text is acceptable and encouraged to match history):
```
/**
 * -----------------------------------------------------------------
 * Modified by: roz
 * Date       : 2025-08-12
 * Changes    : アカウント選択対応/スコープ統一 + Googleステータス検出を改善（非対話でも確認） + Chooserで id_token も取得
 * Category   : バックグラウンド処理・認証
 * -----------------------------------------------------------------
 */
```

## Security & Configuration Tips
- Never commit secrets. Use `.env` for local values; keep `.env.example` updated if variables are required.
- OAuth/Firebase: keys live in config files under `src/`. Rotate if exposed and prefer environment‑driven injection for development.
- Backend (calendar-sync): Firebase Functions Gen2 onCall in `asia-northeast1` (e.g., `requestVerification`, `verifyEmail`, `syncSakaiToCalendar`). Always call via `httpsCallable` — raw HTTP POSTは非推奨。
- Auth/App Check: 本番は Firebase Auth 必須＋App Check 要求。開発時は App Check Debug Token を使用し、運用はブローカーページ等で取得したトークンを付与して呼び出し。
- 制限: @s.thers.ac.jp ドメイン検証と1日2回(JST)のレート制限が有効。
