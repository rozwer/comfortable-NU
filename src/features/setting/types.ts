import { CurrentTime, VERSION } from "../../constant";

type AppInfo = {
    version: string;
    hostname: string;
    currentTime: number;
    useDarkTheme: boolean;
};

export type FetchTime = {
    assignment: number | undefined;
    quiz: number | undefined;
};

type CacheInterval = {
    assignment: number;
    quiz: number;
};

/**
 * -----------------------------------------------------------------
 * Modified by: roz
 * Date       : 2025-05-19
 * Changes    : 未公開課題を非表示にする設定オプションを追加
 * Category   : 機能拡張
 * -----------------------------------------------------------------
 */
type DisplayOption = {
    showCompletedEntry: boolean;
    showLateAcceptedEntry: boolean;
    hideUnpublishedAssignments: boolean;
};

/**
 * -----------------------------------------------------------------
 * Modified by: roz
 * Date       : 2025-01-27
 * Changes    : カレンダー自動同期のon/off設定オプションを追加
 * Category   : 機能拡張
 * -----------------------------------------------------------------
 */
type CalendarSyncOption = {
    autoSyncEnabled: boolean;
};

type CSColor = {
    topDanger: string;
    topWarning: string;
    topSuccess: string;
    topOther: string;
    miniDanger: string;
    miniWarning: string;
    miniSuccess: string;
    miniOther: string;
    timetableDanger: string;
    timetableWarning: string;
    timetableSuccess: string;
    timetableOther: string;
};

const CSTheme = {
    light: { textColor: "#464646", bgColor: "#cacaca", dateColor: "#b01011" },
    dark: { textColor: "#d4d4d4", bgColor: "#555555", dateColor: "#ff7475" }
};

export class Settings {
    appInfo: AppInfo = {
        version: VERSION,
        hostname: window.location.hostname,
        currentTime: CurrentTime,
        useDarkTheme: false
    };
    fetchTime: FetchTime = {
        assignment: undefined,
        quiz: undefined
    };
    cacheInterval: CacheInterval = {
        assignment: 120,
        quiz: 600
    };
    miniSakaiOption: DisplayOption = {
        showCompletedEntry: true,
        showLateAcceptedEntry: false,
        hideUnpublishedAssignments: true
    };
    calendarSyncOption: CalendarSyncOption = {
        autoSyncEnabled: true
    };
    color: CSColor = {
        topDanger: "#f78989",
        topWarning: "#fdd783",
        topSuccess: "#8bd48d",
        topOther: "#adadad",
        miniDanger: "#e85555",
        miniWarning: "#d7aa57",
        miniSuccess: "#62b665",
        miniOther: "#777777",
        timetableDanger: "#e85555",
        timetableWarning: "#d7aa57",
        timetableSuccess: "#62b665",
        timetableOther: "#777777"
    };

    setFetchtime(fetchTime: FetchTime) {
        this.fetchTime = fetchTime;
    }

    setTheme(useDark: boolean) {
        this.appInfo.useDarkTheme = useDark;
    }

    getTextColor() {
        return this.appInfo.useDarkTheme ? CSTheme.dark.textColor : CSTheme.light.textColor;
    }

    getBgColor() {
        return this.appInfo.useDarkTheme ? CSTheme.dark.bgColor : CSTheme.light.bgColor;
    }

    getDateColor() {
        return this.appInfo.useDarkTheme ? CSTheme.dark.dateColor : CSTheme.light.dateColor;
    }
}
