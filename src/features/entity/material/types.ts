/**
 * 授業資料のデータ型定義
 */

/**
 * 授業資料エントリー
 */
export interface Material {
  /** ユニークID */
  id: string;
  /** 授業資料名 */
  name: string;
  /** リンクURL */
  url: string;
  /** 作成日時 */
  createdAt: number;
  /** 更新日時 */
  updatedAt: number;
  /** コースID（どの授業に関連するか） */
  courseId?: string;
}