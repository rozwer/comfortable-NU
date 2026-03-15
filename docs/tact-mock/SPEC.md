# SAKAI-Mock デモページ 拡張機能統合 仕様書

## 概要

既存の SAKAI-Mock ページ (`docs/tact-mock/index.html`) に Comfortable NU 拡張機能のコードを直接埋め込み、拡張機能の動作をインタラクティブに体験できるデモページを構築する。

## ゴール

- 拡張機能をインストールせずにブラウザ上で機能を体験できる
- ON/OFF トグルでビフォー/アフターを即座に確認できる
- 年度切り替えで時間割の変化を見せられる

---

## ファイル構成

```
docs/tact-mock/
├── index.html          # 既存の SAKAI-Mock ページ（変更あり）
├── demo-shim.js        # Chrome API + fetch モック層
├── demo-data.js        # 年度別教科・課題・時間割データ
├── demo-controls.js    # ON/OFF トグル、年度切り替え UI
└── demo-controls.css   # コントロールパネルのスタイル
```

---

## 1. demo-shim.js — Chrome API モック層

### 1.1 chrome.storage.local

localStorage をバックエンドとして使う。キープレフィックス `__cnu_` で名前空間を分離。

```js
window.chrome = window.chrome || {};
chrome.storage = {
  local: {
    get(keys, callback) { /* localStorage から読み出し */ },
    set(items, callback) { /* localStorage に書き込み */ },
    remove(keys, callback) { /* localStorage から削除 */ }
  },
  onChanged: {
    addListener(fn) { /* 変更リスナー登録 */ },
    removeListener(fn) { /* リスナー解除 */ }
  }
};
```

**初期データ**: `demo-data.js` から選択中の年度データを `chrome.storage.local` に事前投入する。

### 1.2 chrome.runtime

```js
chrome.runtime = {
  getURL(path) {
    // 拡張機能のリソースパスを相対パスに変換
    // 例: "img/closeBtn.svg" → "../Image/closeBtn.svg" or data URI
    return `../public/${path}`;
  },
  sendMessage(message, callback) {
    // メッセージタイプに応じてハードコーディングされた応答を返す
    // 詳細は 1.4 参照
  },
  onMessage: {
    addListener(fn) { /* no-op */ }
  }
};
```

### 1.3 chrome.identity（スタブ）

Google カレンダー連携はデモでは省略。

```js
chrome.identity = {
  getAuthToken(opts, callback) {
    callback(undefined); // 未認証を返す
  },
  removeCachedAuthToken(opts, callback) {
    if (callback) callback();
  }
};
```

### 1.4 chrome.runtime.sendMessage ハンドラ

| action | デモでの応答 |
|--------|------------|
| `authenticateGoogle` | `{ success: false, error: "Demo mode" }` |
| `syncToCalendar` | `{ success: false, error: "Demo mode" }` |
| `getGoogleAccounts` | `{ success: true, accounts: [] }` |
| `logout` | `{ success: true }` |
| `checkAutoSync` | `{ success: true, shouldSync: false }` |
| `updateSyncInterval` | `{ success: true }` |
| `setAutoSyncEnabled` | `{ success: true }` |
| `updateNewFileCheckInterval` | `{ success: true }` |
| `FETCH_NUSS_FILE` | `{ success: false, error: "Demo mode" }` |
| `getSakaiDataForSync` | 選択中年度の課題・小テストデータを返す |
| `checkNewFiles` | `{ success: true }` |
| `syncCompleted` | (no-op) |

### 1.5 fetch インターセプト

`window.fetch` をラップし、Sakai API パターンにマッチする URL にはモックデータを返す。それ以外は元の `fetch` にパススルー。

```js
const originalFetch = window.fetch;
window.fetch = function(url, options) {
  const mockResponse = matchMockAPI(url);
  if (mockResponse) {
    return Promise.resolve(new Response(JSON.stringify(mockResponse), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }));
  }
  return originalFetch.call(this, url, options);
};
```

**モック対象エンドポイント**:

| パターン | 返すデータ |
|---------|----------|
| `/direct/site.json` | 選択中年度の全コース一覧 |
| `/direct/content/site/{siteId}.json` | コースごとのファイルツリー |
| `/direct/assignment/site/{courseId}.json` | コースごとの課題一覧 |
| `/direct/sam_pub/context/{courseId}.json` | コースごとの小テスト一覧 |
| `/direct/announcement/site/{courseId}.json` | コースごとのお知らせ |
| `/direct/site/{siteId}.json` | コースメタデータ（担当教員名等） |
| `/direct/assignment/{assignmentId}.json` | 課題詳細 |

---

## 2. demo-data.js — デモデータ

### 2.1 データ構造

```js
window.DEMO_DATA = {
  "2023": { /* 1年生・教養中心 */ },
  "2024": { /* 2年生・専門基礎 */ },
  "2025": { /* 3年生・専門科目（現 demo.html と同じ） */ }
};
```

各年度のデータ構造：

```js
{
  term: "春",           // or "秋"
  courses: [
    {
      id: "n_2025_0846280",
      name: "アルゴリズムとデータ構造(2025年度春/金1限)",
      shortName: "アルゴリズムとデータ構造",
      period: { day: 5, period: 1 },  // 曜日(1=月), 時限
      instructor: "山田 太郎",
      description: "..."
    },
    // ...
  ],
  assignments: [
    {
      id: "a1",
      title: "第9回確認テスト(6/13)",
      courseId: "n_2025_0846280",
      type: "quiz",              // "quiz" | "assignment"
      dueTime: null,             // 相対時間で計算（NOW + hours(18)）
      dueOffset: { hours: 18 },  // NOW からのオフセット
      closeOffset: { hours: 18 },
      submitted: false,
      allowResubmitNumber: "0"
    },
    // ...
  ],
  submitted: [
    // 提出済み課題
  ],
  fileTree: {
    // siteId → ファイルツリー構造
    "n_2025_0846280": {
      content_collection: [
        {
          id: "/group/n_2025_0846280/",
          title: "アルゴリズムとデータ構造",
          type: "collection",
          container: "/",
          numChildren: 3,
          resourceChildren: [/* ... */]
        }
      ]
    }
  },
  announcements: {
    // siteId → お知らせ一覧
  }
}
```

### 2.2 年度別教科一覧

#### 2023年度（1年生・教養）

| 教科名 | 曜日/限 | ID |
|--------|---------|-----|
| 英語（基礎） | 火1 | n_2023_en101 |
| 線形代数学I | 月3 | n_2023_ma101 |
| 微分積分学I | 火4 | n_2023_ma102 |
| 化学基礎I | 水1 | n_2023_ch101 |
| 力学I | 木2 | n_2023_ph101 |
| 基礎セミナー | 月5 | n_2023_ge101 |
| 離散数学及び演習 | 金1-2 | n_2023_cs101 |
| 計算機プログラミング基礎 | 金3-4 | n_2023_cs102 |

#### 2024年度（2年生・専門基礎）

| 教科名 | 曜日/限 | ID |
|--------|---------|-----|
| プログラミング及び演習 | 水1-2 | n_2024_cs201 |
| 電子回路工学及び演習 | 月3,木3 | n_2024_ee201 |
| 電気回路論及び演習 | 月4,木4 | n_2024_ee202 |
| 数学2及び演習 | 火1,火3 | n_2024_ma201 |
| オートマトンと形式言語 | 月3 | n_2024_cs202 |
| 電磁気学基礎演習 | 水3 | n_2024_ph201 |
| 量子力学及び演習 | 水3-4 | n_2024_ph202 |
| 文化・芸術学入門 | 金1 | n_2024_ge201 |

#### 2025年度（3年生・専門） ← 現 demo.html と同一

| 教科名 | 曜日/限 | ID |
|--------|---------|-----|
| アルゴリズムとデータ構造 | 金1 | n_2025_0846280 |
| 真空電子工学 | 月2 | n_2025_0846270 |
| 制御工学 | 金2 | n_2025_0846230 |
| ディジタル信号処理 | 木2 | n_2025_0846240 |
| [遠隔]電気電子情報工学実験第1 | 火3-5 | n_2025_0846130 |
| 線形代数学II | 水1 | n_2025_0846300 |
| 英語(コミュニケーション) | 月1 | n_2025_0846310 |
| 電磁気学II | 水2 | n_2025_0846320 |

### 2.3 課題データ

2025年度は現 `demo.html` の `MOCK_ASSIGNMENTS` / `MOCK_SUBMITTED` をそのまま流用。

2023/2024年度は各3-5件程度の課題をダミーで用意（danger/warning/success/other を1件ずつ）。

### 2.4 ファイルツリーデータ

各コースにつき 2-3 フォルダ、各フォルダに 1-3 ファイルのダミーデータ。

```js
{
  id: "/group/{siteId}/lecture01/",
  title: "第1回 講義資料",
  type: "collection",
  container: "/group/{siteId}/",
  resourceChildren: [
    {
      id: "/group/{siteId}/lecture01/slides.pdf",
      title: "lecture01_slides.pdf",
      type: "application/pdf",
      url: "#",
      size: 2048000,
      modifiedTime: 1700000000000
    }
  ]
}
```

---

## 3. demo-controls.js / demo-controls.css — 制御 UI

### 3.1 コントロールパネル

ページ右下に固定配置のフローティングパネル。

```
┌─────────────────────────────┐
│ Comfortable NU Demo         │
│                             │
│  拡張機能: [ON ◉ / ○ OFF]   │
│                             │
│  年度: [2023] [2024] [2025] │
│                             │
│  学期:  [春] [秋]           │
│                             │
└─────────────────────────────┘
```

### 3.2 ON/OFF トグル動作

**OFF → ON:**
1. `demo-data.js` から選択中年度のデータを `chrome.storage.local` に投入
2. 拡張機能の content_script 相当のコードを実行（DOM 注入）
3. miniSakai パネル、時間割タブ、メモタブ等を生成

**ON → OFF:**
1. 拡張機能が注入した DOM 要素をすべて除去
2. `chrome.storage.local` をクリア
3. ページを元の状態に戻す

**実装方針:**
- 拡張機能のビルド済み JS を `<script>` タグで動的にロード/アンロード
- または、content_script.ts の初期化関数をエクスポートして直接呼び出し

### 3.3 年度切り替え動作

1. 現在の拡張機能 UI を除去
2. `chrome.storage.local` のデータを新年度に差し替え
3. `portal.siteId` / `portal.siteTitle` を更新
4. コースタブ（`.Mrphs-sitesNav__menu`）のコース一覧を差し替え
5. 拡張機能を再初期化

### 3.4 スタイル

```css
.demo-controls {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 99999;
  background: #fff;
  border: 2px solid #1a73e8;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.15);
  font-family: sans-serif;
  min-width: 260px;
}
```

---

## 4. index.html への変更

### 4.1 スクリプト読み込み順序

```html
<!-- 1. デモデータ（先に読み込み） -->
<script src="demo-data.js"></script>

<!-- 2. Chrome API シム（データ投入前に API を用意） -->
<script src="demo-shim.js"></script>

<!-- 3. 制御 UI -->
<link rel="stylesheet" href="demo-controls.css">
<script src="demo-controls.js"></script>

<!-- 4. 拡張機能コード（ON 時に動的ロード） -->
<!-- demo-controls.js が動的に <script src="extension-bundle.js"> を挿入 -->
```

### 4.2 拡張機能バンドルの準備

webpack の既存ビルドから `content_script.js` を取得し、以下の修正を加えたデモ用バンドルを生成する：

- `chrome.` API 呼び出しはシムを通る（グローバルに定義済みなので変更不要）
- `fetch` 呼び出しはインターセプトされる（グローバルに定義済みなので変更不要）
- TACT ホスト名チェック → デモモードフラグで回避

**ビルドコマンド案:**
```bash
# デモ用ビルド（別エントリポイント or 環境変数）
DEMO_MODE=true npm run build:demo
```

または、`dist/content_script.js` をそのままコピーして使う（シムが先に読み込まれていれば動く可能性が高い）。

### 4.3 portal 変数の動的更新

年度切り替え時に `window.portal` オブジェクトを差し替え：

```js
function updatePortal(yearData) {
  window.portal.siteId = yearData.courses[0].id;
  window.portal.siteTitle = yearData.courses[0].name;
}
```

### 4.4 DOM の動的差し替え

年度切り替え時にコースタブを再生成：

```js
function updateCourseTabs(courses) {
  const ul = document.querySelector('#topnav');
  // ホームタブは残す
  // 既存コースタブを除去
  // courses から新しいタブを生成
}
```

---

## 5. 制約・注意事項

### 5.1 動作しない機能（デモ対象外）

| 機能 | 理由 |
|------|------|
| Google カレンダー連携 | OAuth 認証が不可能 |
| NUSS ファイルダウンロード | クロスオリジン制限 |
| 実際のファイルダウンロード | モックデータのため |
| リアルタイム通知 | chrome.alarms 不可 |
| バッジカウント | chrome.action API 不可 |

### 5.2 動作する機能（デモ対象）

| 機能 | 動作 |
|------|------|
| miniSakai パネル | 課題・小テスト一覧の表示 |
| 時間割表示 | 年度別コースの時間割グリッド |
| メモ機能 | localStorage ベースで完全動作 |
| 提出トラッカー | モック課題データで表示 |
| フォルダブラウザ | モックファイルツリーで表示 |
| 色設定 | localStorage ベースで完全動作 |
| 新着ファイル検出 | モックデータで表示 |

### 5.3 CSS の扱い

拡張機能の CSS ファイル群（`public/css/*.css`）は `<link>` タグで直接読み込む：

```html
<link rel="stylesheet" href="../../public/css/comfortable-sakai.css">
<link rel="stylesheet" href="../../public/css/tact-extension.css">
<link rel="stylesheet" href="../../public/css/date-picker.css">
<!-- ... 他の CSS -->
```

注意: GitHub Pages では `public/` ディレクトリからの相対パスが必要。CSS ファイルを `docs/tact-mock/css/` にコピーするか、シンボリックリンクを張る。

### 5.4 画像リソース

`chrome.runtime.getURL()` で参照される画像：

| パス | 用途 |
|------|------|
| `img/closeBtn.svg` | モーダル閉じるボタン |
| `img/logo.png` | miniSakai ロゴ |
| `img/scheduleBtn.svg` | 時間割ボタン |
| `img/favoriteBtn.svg` | お気に入りボタン |
| `img/trackerBtn.svg` | 提出トラッカーボタン |
| `img/folderBtn.svg` | フォルダブラウザボタン |
| `img/miniSakaiBtn.png` | miniSakai トグルボタン |

これらを `docs/tact-mock/img/` にコピーするか、`chrome.runtime.getURL` のシムで `public/img/` への相対パスを返す。

---

## 6. 実装順序

### Phase 1: モック層（demo-shim.js）
1. `chrome.storage.local` の get/set/remove を localStorage で実装
2. `chrome.runtime.getURL` でリソースパスを解決
3. `chrome.runtime.sendMessage` のハンドラを実装
4. `chrome.identity` のスタブを実装
5. `fetch` インターセプトを実装

### Phase 2: デモデータ（demo-data.js）
1. 2025年度データを demo.html の MOCK_COURSES / MOCK_ASSIGNMENTS から移植
2. 2023/2024年度のダミーデータを作成
3. ファイルツリー・お知らせのダミーデータを作成
4. Sakai API レスポンス形式に変換する関数を実装

### Phase 3: 制御UI（demo-controls.js / .css）
1. フローティングパネルの HTML/CSS を実装
2. ON/OFF トグルの動作を実装
3. 年度切り替えの動作を実装
4. コースタブ・portal 変数の動的差し替えを実装

### Phase 4: 拡張機能統合
1. `npm run build:chrome` でビルド
2. `dist/content_script.js` をデモページに配置
3. CSS ファイルを配置
4. 画像リソースを配置
5. 動作確認・デバッグ

### Phase 5: 仕上げ
1. デモバナーにコントロールパネルへの誘導を追加
2. index.html のトップページからデモページへのリンクを追加
3. エラーハンドリング（モック外の API 呼び出し時のフォールバック）
4. モバイル対応

---

## 7. chrome.runtime.getURL マッピング表

GitHub Pages でのパス解決：

```js
const RESOURCE_MAP = {
  'img/closeBtn.svg':     '../Image/closeBtn.svg',    // or docs/tact-mock/img/
  'img/logo.png':         '../Image/128.png',
  'img/scheduleBtn.svg':  '../Image/scheduleBtn.svg',
  'img/favoriteBtn.svg':  '../Image/favoriteBtn.svg',
  'img/trackerBtn.svg':   '../Image/trackerBtn.svg',
  'img/folderBtn.svg':    '../Image/folderBtn.svg',
  'img/miniSakaiBtn.png': '../Image/miniSakaiBtn.png',
  'css/date-picker.css':  './css/date-picker.css',
  'css/memo-styles.css':  './css/memo-styles.css',
};
```

---

## 8. Sakai API モックレスポンス形式

### /direct/site.json

```json
{
  "site_collection": [
    {
      "id": "n_2025_0846280",
      "title": "アルゴリズムとデータ構造(2025年度春/金1限)",
      "type": "course",
      "shortDescription": "",
      "contactName": "山田 太郎"
    }
  ]
}
```

### /direct/assignment/site/{courseId}.json

```json
{
  "assignment_collection": [
    {
      "id": "a1",
      "title": "第9回確認テスト(6/13)",
      "dueTime": { "epochSecond": 1718250000 },
      "closeTime": { "epochSecond": 1718250000 },
      "openTime": { "epochSecond": 1717000000 },
      "submissions": [
        { "dateSubmitted": null }
      ],
      "allowResubmission": false
    }
  ]
}
```

### /direct/sam_pub/context/{courseId}.json

```json
{
  "sam_pub_collection": [
    {
      "publishedAssessmentId": "q1",
      "title": "第9回確認テスト",
      "dueDate": 1718250000000,
      "startDate": 1717000000000,
      "hasSubmission": false,
      "submissionSize": 0
    }
  ]
}
```

### /direct/content/site/{siteId}.json

```json
{
  "content_collection": [
    {
      "id": "/group/{siteId}/",
      "title": "コース名",
      "type": "collection",
      "container": "/",
      "numChildren": 2,
      "resourceChildren": ["/group/{siteId}/lecture01/"]
    },
    {
      "id": "/group/{siteId}/lecture01/",
      "title": "第1回講義資料",
      "type": "collection",
      "container": "/group/{siteId}/",
      "numChildren": 1,
      "resourceChildren": ["/group/{siteId}/lecture01/slides.pdf"]
    },
    {
      "id": "/group/{siteId}/lecture01/slides.pdf",
      "title": "slides.pdf",
      "type": "application/pdf",
      "container": "/group/{siteId}/lecture01/",
      "url": "#",
      "size": 2048000,
      "modifiedDate": "2025-06-01T10:00:00Z",
      "numChildren": 0
    }
  ]
}
```

### /direct/site/{siteId}.json

```json
{
  "id": "n_2025_0846280",
  "title": "アルゴリズムとデータ構造(2025年度春/金1限)",
  "description": "アルゴリズムとデータ構造の基礎を学ぶ",
  "shortDescription": "",
  "contactName": "山田 太郎",
  "type": "course"
}
```
