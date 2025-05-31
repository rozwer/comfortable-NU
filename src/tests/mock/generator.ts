import { Assignment, AssignmentEntry } from "../../features/entity/assignment/types";
import { Course } from "../../features/course/types";

export const mockCourse = (id: string): Course => {
  return new Course(id, id, "");
};

/**
 * -----------------------------------------------------------------
 * Modified by: roz
 * Date       : 2025-05-28
 * Changes    : checkTimestampパラメータを追加してテスト用AssignmentEntryの生成に対応
 * Category   : テスト
 * -----------------------------------------------------------------
 */
export const mockAssignmentEntry = (
  id: string,
  dueTime: number,
  closeTime: number,
  hasFinished: boolean,
  checkTimestamp?: string
): AssignmentEntry => {
  /**
   * -----------------------------------------------------------------
   * Modified by: roz
   * Date       : 2025-05-28
   * Changes    : AssignmentEntryコンストラクタにcheckTimestampパラメータを追加
   * Category   : テスト
   * -----------------------------------------------------------------
   */
  return new AssignmentEntry(id, id, dueTime, closeTime, hasFinished, undefined, false, "-1", checkTimestamp);
};


