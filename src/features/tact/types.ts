/**
 * TACT API関連の型定義
 */

/**
 * TACT Content APIのレスポンス型
 */
export interface TactContentResponse {
  content_collection: TactContentItem[];
}

/**
 * TACTコンテンツアイテム
 */
export interface TactContentItem {
  contentId: string;
  title: string;
  description?: string;
  type: string; // 'collection' | MIME type
  url: string;
  size?: number;
  lastModified?: string;
  container?: string; // 親フォルダのID
  isCollection: boolean;
  resourceId: string;
  hidden: boolean;
  createdTime: string;
  modifiedTime: string;
  author?: string;
  copyrightAlert?: boolean;
  numChildren?: number;
}

/**
 * TACT Assignment APIのレスポンス型
 */
export interface TactAssignmentResponse {
  assignment2_collection?: TactAssignment[];
}

/**
 * TACT課題情報
 */
export interface TactAssignment {
  assignmentId: string;
  title: string;
  instructions: string;
  dueTime: string;
  openTime: string;
  closeTime?: string;
  allowAttachments: boolean;
  attachments?: TactAttachment[];
  submissions?: TactSubmission[];
}

/**
 * TACT課題添付ファイル
 */
export interface TactAttachment {
  attachmentId: string;
  name: string;
  url: string;
  size: number;
  type: string;
}

/**
 * TACT課題提出情報
 */
export interface TactSubmission {
  submissionId: string;
  submittedTime: string;
  attachments?: TactAttachment[];
}

/**
 * フォルダツリー構造
 */
export interface FolderTreeNode {
  id: string;
  name: string;
  type: 'folder' | 'file';
  mimeType?: string;
  url?: string;
  size?: number;
  lastModified?: string;
  children?: FolderTreeNode[];
  isExpanded?: boolean;
  level: number;
}

/**
 * メモ情報
 */
export interface TactMemo {
  id: string;
  title: string;
  content: string;
  type: 'text' | 'link';
  courseId: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * プレビューサポート対象ファイル
 */
export interface PreviewableFile {
  id: string;
  name: string;
  url: string;
  type: 'pdf' | 'image' | 'text' | 'unsupported';
  mimeType: string;
}

/**
 * ダウンロード設定
 */
export interface DownloadConfig {
  includeSubfolders: boolean;
  fileTypes: string[]; // MIME types or extensions
  maxFileSize?: number; // bytes
}

/**
 * API設定
 */
export interface TactApiConfig {
  baseUrl: string;
  credentials: 'include' | 'same-origin' | 'omit';
  timeout: number;
}
