import { Assignment, AssignmentEntry } from "./types";
import { Course } from "../../course/types";
import { CurrentTime } from "../../../constant";

/**
 * Decode Assignment data from Sakai REST API to AssignmentEntry array.
 * @param data - Data from Sakai REST API.
 * @returns {Array<AssignmentEntry>} - Decoded AssignmentEntry array.
 */
/**
 * -----------------------------------------------------------------
 * Modified by: roz
 * Date       : 2025-05-19
 * Changes    : 課題データのデコード時に提出状態と再提出情報を取得
 * Category   : データ処理
 * -----------------------------------------------------------------
 */
export const decodeAssignmentFromAPI = (data: Record<string, any>): Array<AssignmentEntry> => {
    return data.assignment_collection
        .filter((json: any) => json.closeTime.epochSecond >= CurrentTime)
        .map((json: any) => {
            // ユーザーによる提出状態を確認
            let submitted = false;
            let allowResubmitNumber = "-1"; // デフォルト値
            
            // 提出物情報がある場合は提出状態を取得
            if (json.submissions && json.submissions.length > 0) {
                // 提出されているかどうかを判定
                // dateSubmittedがある場合のみ提出済みとみなす
                if (json.submissions[0].dateSubmitted && json.submissions[0].dateSubmitted !== '') {
                    submitted = true;
                }
                
                // 再提出可能回数を取得（プロパティに存在する場合）
                if (json.submissions[0].properties && json.submissions[0].properties.allow_resubmit_number) {
                    allowResubmitNumber = json.submissions[0].properties.allow_resubmit_number;
                }
            }
            
            return new AssignmentEntry(
                json.id,
                json.title,
                json.dueTime.epochSecond ? json.dueTime.epochSecond : null,
                json.closeTime.epochSecond ? json.closeTime.epochSecond : null,
                false,
                json.openTimeString || null,
                submitted,
                allowResubmitNumber
            );
        });
};

/**
 * Decode Assignment data from Storage to Assignment array.
 * @param data - Data from Storage.
 * @returns {Array<Assignment>} - Decoded Assignment array.
 */
export const decodeAssignmentFromArray = (data: Array<any>): Array<Assignment> => {
    const assignments: Array<Assignment> = [];
    if (typeof data === "undefined") return assignments;
    for (const assignment of data) {
        const course: Course = new Course(assignment.course.id, assignment.course.name, assignment.course.link);
        const isRead: boolean = assignment.isRead;
        const entries: Array<AssignmentEntry> = [];
        /**
         * -----------------------------------------------------------------
         * Modified by: roz
         * Date       : 2025-05-19
         * Changes    : 課題データの格納時に提出状態と再提出情報を取得
         * Category   : データ処理
         * -----------------------------------------------------------------
         */
        for (const e of assignment.entries) {
            const entry = new AssignmentEntry(
                e.id, 
                e.title, 
                e.dueTime, 
                e.closeTime, 
                e.hasFinished,
                e.openTimeString || null,
                e.submitted || false,
                e.allowResubmitNumber || "-1"
            );
            if (entry.getCloseDateTimestamp > CurrentTime) entries.push(entry);
        }
        assignments.push(new Assignment(course, entries, isRead));
    }
    return assignments;
};
