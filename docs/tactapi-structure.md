# TactAPI 構造調査レポート

## 概要

**Comfortable NU** は名古屋大学の Sakai LMS（TACT: `tact.ac.thers.ac.jp`）用の Chrome 拡張機能。
課題・小テスト・資料を整理し、Google カレンダー連携やメモ管理などの機能を提供する。

## アーキテクチャ（レイヤー構造）

```
┌─────────────────────────────────────────────────────┐
│  エントリーポイント層                                  │
│  content_script.ts → index-new.ts                    │
├─────────────────────────────────────────────────────┤
│  UI層（プレゼンテーション）                              │
│  folder-ui.ts / memo-ui.ts / index.ts(モーダル)       │
├─────────────────────────────────────────────────────┤
│  ビジネスロジック層                                     │
│  tact-api.ts / memo.ts / folder.ts / timetable.ts    │
├─────────────────────────────────────────────────────┤
│  データストレージ層                                     │
│  file-storage.ts / tact-storage.ts                    │
├─────────────────────────────────────────────────────┤
│  API通信層                                            │
│  features/api/fetch.ts (Sakai REST API)               │
├─────────────────────────────────────────────────────┤
│  型定義層                                              │
│  types.ts                                             │
└─────────────────────────────────────────────────────┘
```

## TACT REST API エンドポイント

| エンドポイント | メソッド | 用途 |
|---|---|---|
| `/direct/content/site/{siteId}.json` | GET | サイトのコンテンツ（ファイル/フォルダ）一覧取得 |
| `/direct/assignment/site/{courseId}.json` | GET | 課題一覧取得 |
| `/direct/sam_pub/context/{courseId}.json` | GET | クイズ（小テスト）一覧取得 |
| `/direct/announcement/site/{siteId}.json` | GET | お知らせ一覧取得 |

全て `credentials: 'include'`（Cookie 認証）で呼び出される。
ベース URL: `https://tact.ac.thers.ac.jp`

## API レスポンス型定義

### Content API

```typescript
interface TactContentResponse {
  content_collection: TactContentItem[];
}

interface TactContentItem {
  contentId: string;
  title: string;
  type: string;           // 'collection'（フォルダ）or MIME タイプ（ファイル）
  url: string;
  container?: string;      // 親フォルダのパス（階層構造の鍵）
  isCollection: boolean;
  resourceId: string;
  numChildren?: number;
  size?: number;
  hidden: boolean;
  createdTime: string;
  modifiedTime: string;
}
```

### Assignment API

```typescript
interface TactAssignmentResponse {
  assignment2_collection?: TactAssignment[];
}

interface TactAssignment {
  assignmentId: string;
  title: string;
  instructions: string;
  dueTime: string;
  openTime: string;
  closeTime?: string;
  attachments?: TactAttachment[];
  submissions?: TactSubmission[];
}
```

## コア処理フロー

```
TactApiClient.fetchSiteContent(siteId)
  → fetch('/direct/content/site/{siteId}.json')
  → response.content_collection を取得
  → FileStorage.createNodeFromApiData() で FileSystemNode に変換
  → FileStorage.saveNodes() で localStorage に永続化
  → TactApiClient.buildFileTreeFromStorage() でツリー構築
    → container パスを '/' で分解して階層構造を再構築
    → FolderTreeNode のツリーを返す
```

## ファイルストレージ（file-storage.ts）

`FileSystemNode` は API データにローカル編集情報を重ねるハイブリッド構造:

```typescript
interface FileSystemNode {
  id: string;                              // container + title から生成
  originalName / displayName;              // 元の名前 / ユーザー変更後の名前
  originalContainer / displayContainer;    // 元のパス / 移動後のパス
  visible: boolean;                        // 表示/非表示
  localChanges: { moved, renamed, hidden };
}
```

ストレージキー: `tact-file-system-{siteId}` でサイトごとに分離保存。

## 機能モジュール一覧

| ファイル | 機能 |
|---|---|
| `tact-api.ts` | API 呼び出し、ツリー構築、HTML 描画、名前変更/移動/非表示 |
| `file-storage.ts` | FileSystemNode の永続化、CRUD 操作 |
| `folder-ui.ts` | フォルダタブ UI（授業資料/課題/お知らせの 3 タブ）、編集モード、一括ダウンロード |
| `folder.ts` | FolderManager（フォルダの CRUD、イベントリスナー） |
| `memo.ts` | MemoManager / LinkManager（講義メモの CRUD、検索、エクスポート/インポート） |
| `memo-ui.ts` | MemoUI（メモ作成/編集/削除のダイアログ、タブ切替） |
| `timetable.ts` | 時間割表示（曜日×時限のグリッド、学期フィルタ、教室管理） |
| `index-new.ts` | 機能統合エントリー（メモタブ + フォルダタブの初期化） |
| `index.ts` | レガシーエントリー（メモ + 掲示板タブ） |
| `jszip-loader.ts` | JSZip のシングルトンローダー（一括ダウンロード用） |

## 初期化フロー

```
content_script.ts :: main()
  → isTactPortal() で tact.ac.thers.ac.jp を判定
  → initTactFeatures()
    → setInterval で #toolMenu ul の出現を監視
    → initializeTactFeatures() (index-new.ts)
      → addMemoTab()   → ツールメニューに「メモ」タブ追加
      → addFolderTab() → ツールメニューに「フォルダ」タブ追加
  → setupAutoSyncCheck()
    → Google カレンダーへの自動同期（background.js と連携）
```

## Sakai LMS DOM 統合

TACT の Sakai UI に統合するための CSS クラスセレクタ:

- `#toolMenu ul` — ツールメニューリスト
- `.Mrphs-toolsNav__menuitem--link` — メニューアイテムのリンク
- `.Mrphs-hierarchy--siteName` — 講義名ヘッダー
- `#toolsNav-toggle-li` — 折りたたみボタン（挿入位置の基準）
- `.fav-sites-entry` — お気に入りコース

URL からのサイト ID 抽出: `/site/([^\/]+)` パターンでマッチ。
