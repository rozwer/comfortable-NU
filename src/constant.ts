/**
 * -----------------------------------------------------------------
 * Modified by: roz
 * Date       : 2025-05-28
 * Changes    : 時間割データの年度・学期情報保存用のストレージキーを追加
 * Category   : 機能拡張
 * -----------------------------------------------------------------
 */
// filepath: /home/rozwer/sakai/comfortable-sakai/src/constant.ts
export const MODE = process.env.NODE_ENV;
let _version = "---";
if (MODE === "production") {
    _version = chrome.runtime.getManifest().version;
}
export const VERSION = _version;
export const CurrentTime = new Date().getTime() / 1000;
export const AssignmentsStorage = "Assignments";
export const QuizzesStorage = "Quizzes";
export const MemosStorage = "Memos";
export const CoursesStorage = "Courses";
export const SettingsStorage = "Settings";
export const AssignmentFetchTimeStorage = "AssignmentFetchTime";
export const QuizFetchTimeStorage = "QuizFetchTime";
export const HostnameStorage = "Hostname";
/**
 * -----------------------------------------------------------------
 * Modified by: roz
 * Date       : 2025-05-28
 * Changes    : 時間割データの年度・学期情報を保存するストレージキーを追加
 * Category   : 機能拡張
 * -----------------------------------------------------------------
 */
export const TimetableYearStorage = "TimetableYear";
export const TimetableTermStorage = "TimetableTerm";
export const TimetableShowAllCoursesStorage = "TimetableShowAllCourses";
export const MaxTimestamp = 99999999999999;
export const TACT_HOSTNAME = "tact.ac.thers.ac.jp";
/**
 * -----------------------------------------------------------------
 * Modified by: roz
 * Date       : 2026-03-15
 * Changes    : 新着ファイル検知機能のストレージキーを追加
 * Category   : 機能拡張
 * -----------------------------------------------------------------
 */
/** コース別ファイル最終チェック時刻: { [courseId]: number } */
export const FileCheckedTimestampsStorage = "fileCheckedTimestamps";
/** コース別新着ファイルフラグ: { [courseId]: boolean } */
export const NewFileFlagsStorage = "newFileFlags";
/** 新着ファイルチェックのアラーム名 */
export const NEW_FILE_CHECK_ALARM_NAME = "newFileCheckAlarm";
/** 新着ファイルチェックのデフォルト間隔（分） */
export const DEFAULT_NEW_FILE_CHECK_INTERVAL = 30;
