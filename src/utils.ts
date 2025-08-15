/**
 * -----------------------------------------------------------------
 * Modified by: roz
 * Date       : 2025-05-28
 * Changes    : 課題ステータス分類ロジックの拡張とチェックタイムスタンプ対応を追加
 * Category   : ロジック拡張
 * -----------------------------------------------------------------
 */
// filepath: /home/rozwer/sakai/comfortable-sakai/src/utils.ts
import { FetchTime, Settings } from "./features/setting/types";
import { Course } from "./features/course/types";
import { Assignment } from "./features/entity/assignment/types";
import { Quiz } from "./features/entity/quiz/types";
import { Memo } from "./features/entity/memo/types";
import { getAssignments } from "./features/entity/assignment/getAssignment";
import { getQuizzes } from "./features/entity/quiz/getQuiz";
import { getMemos } from "./features/entity/memo/getMemo";
import { fromStorage } from "./features/storage";
import { AssignmentFetchTimeStorage, CurrentTime, MaxTimestamp, QuizFetchTimeStorage } from "./constant";
import { saveAssignments } from "./features/entity/assignment/saveAssignment";
import { EntryProtocol } from "./features/entity/type";
import {i18nMessage} from "./features/chrome";

/**
 * -----------------------------------------------------------------
 * Modified by: roz
 * Date       : 2025-05-28
 * Changes    : 新しい課題ステータスタイプ（notPublished、submitted、dismissed）を追加
 * Category   : タイプ定義
 * -----------------------------------------------------------------
 */
export type DueCategory = "due24h" | "due5d" | "due14d" | "dueOver14d" | "duePassed" | "notPublished" | "submitted" | "dismissed";

/**
 * Fetch entities for miniSakai.
 * @param settings - Settings for miniSakai.
 * @param courses - List of Course sites.
 * @param cacheOnly - A flag to force use cache.
 */
export async function getEntities(settings: Settings, courses: Array<Course>, cacheOnly = false) {
    const hostname = settings.appInfo.hostname;
    const currentTime = settings.appInfo.currentTime;
    const fetchTime = await getFetchTime(hostname);
    const assignment: Array<Assignment> = await getAssignments(
        hostname,
        courses,
        cacheOnly || shouldUseCache(fetchTime.assignment, currentTime, settings.cacheInterval.assignment)
    );
    const quiz: Array<Quiz> = await getQuizzes(
        hostname,
        courses,
        cacheOnly || shouldUseCache(fetchTime.quiz, currentTime, settings.cacheInterval.quiz)
    );
    const memo: Array<Memo> = await getMemos(hostname);
    return {
        assignment: assignment,
        quiz: quiz,
        memo: memo
    };
}

/**
 * Decoder for timestamp.
 * @param data - Target value
 * @returns {number | undefined}
 */
const decodeTimestamp = (data: any): number | undefined => {
    if (data === undefined) return undefined;
    return data as number;
};

/**
 * Decides whether to use cache or not according to last fetched time.
 * @param fetchTime - Last fetched timestamp
 * @param currentTime - Current timestamp
 * @param cacheInterval - User-configured cache time-interval
 * @returns {boolean}
 */
export const shouldUseCache = (fetchTime: number | undefined, currentTime: number, cacheInterval: number): boolean => {
    if (fetchTime === undefined) return false;
    return currentTime - fetchTime <= cacheInterval;
};

/**
 * Get last fetched time from Storage.
 * @param hostname - A PRIMARY key for storage. Usually a hostname of Sakai LMS.
 * @returns {Promise<FetchTime>>}
 */
export async function getFetchTime(hostname: string): Promise<FetchTime> {
    const assignmentTime = await fromStorage<number | undefined>(hostname, AssignmentFetchTimeStorage, decodeTimestamp);
    const quizTime = await fromStorage<number | undefined>(hostname, QuizFetchTimeStorage, decodeTimestamp);
    return {
        assignment: assignmentTime,
        quiz: quizTime
    };
}

/**
 * -----------------------------------------------------------------
 * Modified by: roz
 * Date       : 2025-05-28
 * Changes    : 課題の提出状態、公開日時、チェックタイムスタンプに基づいた分類ロジックを追加
 * Category   : ロジック拡張
 * -----------------------------------------------------------------
 */
/**
 * Calculate category of due date according to days until due.
 * @param {number} dt1 Current timestamp
 * @param {number} dt2 Target timestamp
 * @param {object} entryInfo Optional entry information
 * @returns {DueCategory}
 */
function getDaysUntil(dt1: number, dt2: number, entryInfo?: { openTimeString?: string; submitted?: boolean; checkTimestamp?: string }): DueCategory {
    // 提出状態がtrueならsubmittedカテゴリを割り当て
    if (entryInfo && entryInfo.submitted === true) {
        return "submitted";
    }
    
    // チェックタイムスタンプがあり、現在時刻より後なら非表示カテゴリを割り当て
    if (entryInfo && entryInfo.checkTimestamp) {
        try {
            const parts = entryInfo.checkTimestamp.split('/');
            if (parts.length === 4) {
                const checkDate = new Date(
                    parseInt(parts[0]), // 年
                    parseInt(parts[1]) - 1, // 月（JavaScriptでは0始まり）
                    parseInt(parts[2]), // 日
                    parseInt(parts[3]) // 時間
                );
                
                // チェック時刻が現在時刻よりも後であれば非表示
                if (checkDate.getTime() / 1000 > dt1) {
                    return "dismissed";
                }
            }
        } catch (e) {
            console.error("Invalid timestamp format:", e);
        }
    }
    
    // 公開日より前ならnotPublishedカテゴリを割り当て
    if (entryInfo && entryInfo.openTimeString) {
        const openTime = new Date(entryInfo.openTimeString).getTime() / 1000;
        if (dt1 < openTime) {
            return "notPublished";
        }
    }
    
    // その他の場合は従来通りの期限ベースでカテゴリ判定
    let diff = dt2 - dt1;
    diff /= 3600 * 24;
    let category: DueCategory;
    if (diff > 0 && diff <= 1) {
        category = "due24h";
    } else if (diff > 1 && diff <= 5) {
        category = "due5d";
    } else if (diff > 5 && diff <= 14) {
        category = "due14d";
    } else if (diff > 14) {
        category = "dueOver14d";
    } else {
        category = "duePassed";
    }
    return category;
}

/**
 * Format timestamp for miniSakai.
 * @param {number | undefined} timestamp - Target timestamp
 * @returns {string}
 */
function formatTimestamp(timestamp: number | undefined): string {
    if (timestamp === undefined) return "---";
    const date = new Date(timestamp * 1000);
    return (
        date.toLocaleDateString() +
        " " +
        date.getHours() +
        ":" +
        ("00" + date.getMinutes()).slice(-2) +
        ":" +
        ("00" + date.getSeconds()).slice(-2)
    );
}

/**
 * Get the closest timestamp of given Entries.
 * @param settings - Settings for miniSakai.
 * @param entries - Entries of each Entity.
 */
export const getClosestTime = (settings: Settings, entries: Array<EntryProtocol>): number => {
    const option = settings.miniSakaiOption;
    const appInfo = settings.appInfo;
    return entries
        .filter((e) => {
            // Check if user chose to hide completed Entry
            if (!option.showCompletedEntry) {
                /**
                 * -----------------------------------------------------------------
                 * Modified by: roz
                 * Date       : 2025-05-28
                 * Changes    : チェックタイムスタンプを考慮した完了判定ロジックに変更
                 * Category   : ロジック変更
                 * -----------------------------------------------------------------
                 */
                // 完了したエントリーかどうかは、チェックタイムスタンプの日付が現在時刻よりも後であるかどうかで判断する
                const checkTimestamp = (e as any).checkTimestamp;
                if (checkTimestamp) {
                    // yyyy/mm/dd/hh形式のタイムスタンプをパースして現在時刻と比較
                    const parts = checkTimestamp.split('/');
                    if (parts.length === 4) {
                        const checkDate = new Date(
                            parseInt(parts[0]), // 年
                            parseInt(parts[1]) - 1, // 月（0-11）
                            parseInt(parts[2]), // 日
                            parseInt(parts[3]) // 時間
                        );
                        // チェック時刻が現在時刻よりも後であればtrueを返す（表示しない）
                        if (checkDate.getTime() / 1000 > settings.appInfo.currentTime) return false;
                    }
                }
            }
            return settings.appInfo.currentTime <= e.getTimestamp(appInfo.currentTime, option.showLateAcceptedEntry);
        })
        .reduce(
            (prev, e) => Math.min(e.getTimestamp(appInfo.currentTime, option.showLateAcceptedEntry), prev),
            MaxTimestamp
        );
};

/**
 * Get script tag.
 * @returns {Array<HTMLScriptElement>}
 */
export const getScripts = (): Array<HTMLScriptElement> => {
    return Array.from(document.getElementsByTagName("script"));
};

/**
 * Check if user is logged-in to Sakai LMS.
 */
function isLoggedIn(): boolean {
    const scripts = getScripts();
    let loggedIn = false;
    for (const script of scripts) {
        if (script.text.match("\"loggedIn\": true")) loggedIn = true;
    }
    return loggedIn;
}

/**
 * Get Course site ID of current page.
 * @param currentHref - Current href.
 * @returns {string | undefined}
 */
export const getCourseSiteID = (currentHref: string): string | undefined => {
    let courseID: string | undefined;
    const reg = new RegExp("(https?://[^/]+)/portal/site/([^/]+)");
    if (currentHref.match(reg)) {
        courseID = currentHref.match(reg)?.[2];
    }
    return courseID;
};

/**
 * Update a read flag of visited Course site.
 * Only Assignments have read flags as of now.
 * @param currentHref - Current href.
 * @param assignments - List of Assignments
 * @param hostname -  A key for storage. Usually a hostname of Sakai LMS.
 */
export const updateIsReadFlag = (currentHref: string, assignments: Array<Assignment>, hostname: string) => {
    const courseID = getCourseSiteID(currentHref);
    if (courseID === undefined) return;
    for (const assignment of assignments) {
        if (assignment.course.id === courseID && assignment.entries.length > 0) {
            assignment.isRead = true;
            saveAssignments(hostname, assignments);
        }
    }
};

/**
 * Changes miniSakai loading state to ready state.
 */
function miniSakaiReady(): void {
    const loadingIcon = document.getElementsByClassName("cs-loading")[0];
    const hamburgerIcon = document.createElement("img");
    hamburgerIcon.src = chrome.runtime.getURL("img/miniSakaiBtn.png");
    hamburgerIcon.className = "cs-minisakai-btn";
    loadingIcon.className = "cs-minisakai-btn-div";
    loadingIcon.append(hamburgerIcon);
}

/**
 * Get remaining time-string for miniSakai.
 * @param dueInSeconds
 * @returns {string} - i18n formatted string
 */
export function getRemainTimeString(dueInSeconds: number): string {
    if (dueInSeconds === MaxTimestamp) return chrome.i18n.getMessage("due_not_set");
    const seconds = dueInSeconds - CurrentTime;
    const day = Math.floor(seconds / (3600 * 24));
    const hours = Math.floor((seconds - day * 3600 * 24) / 3600);
    const minutes = Math.floor((seconds - (day * 3600 * 24 + hours * 3600)) / 60);
    const args = [day.toString(), hours.toString(), minutes.toString()];
    return i18nMessage("remain_time", args);
}

/**
 * Create date string for miniSakai.
 * @param seconds - Target timestamp.
 * @returns {string}
 */
export function createDateString(seconds: number | null | undefined): string {
    if (seconds === MaxTimestamp || seconds === undefined || seconds === null) return "----/--/--";
    const date = new Date(seconds * 1000);
    return date.toLocaleDateString() + " " + date.getHours() + ":" + ("00" + date.getMinutes()).slice(-2);
}

export { getDaysUntil, formatTimestamp, isLoggedIn, miniSakaiReady };
