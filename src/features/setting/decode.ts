import { Settings } from "./types";

/**
 * Decode Settings data from Storage to Settings object.
 * @param data - Data from Storage.
 * @returns {Array<Memo>} - Decoded Memo array.
 */
export const decodeSettings = (data: any): Settings => {
    const settings = new Settings();
    if (typeof data === "undefined") return settings;
    settings.appInfo = data.appInfo;
    settings.fetchTime = data.fetchTime;
    // キャッシュ間隔は下限を強制（assignment:120秒, quiz:600秒）
    const ci = data.cacheInterval || {};
    const assignment = typeof ci.assignment === 'number' ? ci.assignment : settings.cacheInterval.assignment;
    const quiz = typeof ci.quiz === 'number' ? ci.quiz : settings.cacheInterval.quiz;
    settings.cacheInterval = {
        assignment: isNaN(assignment) || assignment < 120 ? 120 : assignment,
        quiz: isNaN(quiz) || quiz < 600 ? 600 : quiz
    } as any;
    settings.miniSakaiOption = data.miniSakaiOption;
    settings.color = data.color;
    return settings;
};
