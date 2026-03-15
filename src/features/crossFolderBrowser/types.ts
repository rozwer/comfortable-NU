/**
 * 全教科横断フォルダブラウザの型定義
 */

/** フォルダブラウザ用ノード */
export interface CrossFolderNode {
    name: string;
    type: 'semester' | 'course' | 'folder' | 'file';
    children?: CrossFolderNode[];
    url?: string;
    webLinkUrl?: string;
    /** 所属コース名（ファイル/フォルダに付与） */
    courseName?: string;
    /** 所属学期ラベル（例: "2025前期"） */
    semesterLabel?: string;
    /** フルパス文字列（検索結果表示用） */
    fullPath?: string;
    /** 新着フラグ */
    isNew?: boolean;
    /** フォルダの展開状態 */
    isExpanded?: boolean;
}

/** コース情報（Content APIフェッチ用） */
export interface CrossFolderCourse {
    id: string;       // サイトID
    title: string;    // コースタイトル
}

/** キャッシュデータ構造 */
export interface CrossFolderCache {
    tree: CrossFolderNode[];
    generatedAt: number; // UNIX timestamp (ms)
}

/** 検索結果エントリ */
export interface SearchResult {
    node: CrossFolderNode;
    /** マッチ箇所ハイライト済みHTML */
    highlightedName: string;
    /** フルパス（表示用） */
    displayPath: string;
}
