/**
 * -----------------------------------------------------------------
 * Modified by: roz
 * Date       : 2025-05-28
 * Changes    : 新しい課題ステータスタイプのマッピング追加とコース色情報管理機能を追加
 * Category   : 機能拡張
 * -----------------------------------------------------------------
 */
// filepath: /home/rozwer/sakai/comfortable-sakai/src/components/favoritesBar.ts
import { DueCategory, getClosestTime, getDaysUntil } from "../utils";
import { Settings } from "../features/setting/types";
import { EntityProtocol, EntryProtocol } from "../features/entity/type";
import { MaxTimestamp } from "../constant";

/**
 * -----------------------------------------------------------------
 * Modified by: roz
 * Date       : 2025-05-28
 * Changes    : コース色情報を他のモジュールと共有するためのグローバル変数を追加
 * Category   : 機能拡張
 * -----------------------------------------------------------------
 */
// コース色情報を共有するためのグローバル変数
export let courseColorInfo: string = "";

/**
 * -----------------------------------------------------------------
 * Modified by: roz
 * Date       : 2025-05-28
 * Changes    : 新しい課題ステータスタイプ（submitted, notPublished, dismissed）に対応するマッピングを追加
 * Category   : 機能拡張
 * -----------------------------------------------------------------
 */
const dueCategoryClassMap: { [key in DueCategory]: string } = {
    due24h: "cs-tab-danger",
    due5d: "cs-tab-warning",
    due14d: "cs-tab-success",
    dueOver14d: "cs-tab-other",
    duePassed: "cs-tab-default",
    notPublished: "cs-tab-default",
    submitted: "cs-tab-default",
    dismissed: "cs-tab-default"
};

/**
 * -----------------------------------------------------------------
 * Modified by: roz
 * Date       : 2025-05-28
 * Changes    : 色のクラス名から人間が読みやすい色の名前に変換する関数を追加
 * Category   : 機能拡張
 * -----------------------------------------------------------------
 */
/**
 * 色のクラス名から人間が読みやすい色の名前に変換する
 */
const getColorName = (colorClass: string): string => {
    switch (colorClass) {
        case "cs-tab-danger":
            return "赤 (24時間以内の締切)";
        case "cs-tab-warning":
            return "黄 (5日以内の締切)";
        case "cs-tab-success":
            return "緑 (14日以内の締切)";
        case "cs-tab-other":
            return "青 (14日超の締切)";
        case "cs-tab-default":
            return "デフォルト (締切切れ/公開前/提出済み/非表示)";
        default:
            return "色なし";
    }
};

type CourseMap = Map<string, { entries: EntryProtocol[]; isRead: boolean }>;
type DueMap = Map<string, { due: DueCategory; isRead: boolean }>;

const createCourseMap = (entities: EntityProtocol[]): CourseMap => {
    const courseMap = new Map<string, { entries: EntryProtocol[]; isRead: boolean }>();
    for (const entity of entities) {
        let entries = courseMap.get(entity.course.id);
        if (entries === undefined) {
            entries = { entries: [], isRead: true };
            courseMap.set(entity.course.id, entries);
        }
        entries.entries.push(...entity.entries);
        entries.isRead = entries.isRead && (entity.isRead || entity.entries.length === 0);
    }
    return courseMap;
};

/**
 * -----------------------------------------------------------------
 * Modified by: roz
 * Date       : 2025-05-28
 * Changes    : 課題の提出状態、公開日情報、チェックタイムスタンプを考慮したカテゴリマッピングに変更
 * Category   : ロジック拡張
 * -----------------------------------------------------------------
 */
const createDueMap = (settings: Settings, courseMap: CourseMap): DueMap => {
    const dueMap = new Map<string, { due: DueCategory; isRead: boolean }>();
    for (const [courseID, entries] of courseMap.entries()) {
        if (entries.entries.length === 0) continue;
        
        // すべてのエントリーに対してカテゴリを計算して優先度の高いものを選択する
        let highestPriorityCategory: DueCategory = "duePassed"; // デフォルト値（優先度最低）
        const categoryPriority: { [key in DueCategory]: number } = {
            "due24h": 5,      // 最高優先度
            "due5d": 4,
            "due14d": 3,
            "dueOver14d": 2,
            "duePassed": 1,
            "notPublished": 0,
            "submitted": 0,
            "dismissed": 0
        };
        
        let isRead = true;
        
        for (const entry of entries.entries) {
            // 完了済みかどうかはcheckTimestampで判断
            const checkTimestamp = (entry as any).checkTimestamp;
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
                    // チェック時刻が現在時刻よりも後であれば処理をスキップ
                    if (checkDate.getTime() / 1000 > settings.appInfo.currentTime) continue;
                }
            }
            // 提出済みのエントリは考慮しない
            if ((entry as any).submitted === true) continue;

            // エントリの締め切り時間を取得
            const entryDueTime = entry.getTimestamp(settings.appInfo.currentTime, settings.miniSakaiOption.showLateAcceptedEntry);
            if (entryDueTime === MaxTimestamp) continue;
            
            // 追加情報を取得
            const entryInfo = {
                openTimeString: (entry as any).openTimeString,
                submitted: (entry as any).submitted,
                hasFinished: entry.hasFinished
            };
            
            // このエントリのカテゴリを計算
            const entryCategory = getDaysUntil(settings.appInfo.currentTime, entryDueTime, entryInfo);
            
            // 既存のカテゴリより優先度が高ければ更新
            if (categoryPriority[entryCategory] > categoryPriority[highestPriorityCategory]) {
                highestPriorityCategory = entryCategory;
            }
            
            // 既読状態を確認
            isRead = isRead && (entries.isRead || entries.entries.length === 0);
        }
        
        // 何かしらのエントリが見つかった場合のみ追加
        if (highestPriorityCategory !== "duePassed" || entries.entries.length > 0) {
            dueMap.set(courseID, { due: highestPriorityCategory, isRead: isRead });
        }
    }
    return dueMap;
};

/**
 * Add notification badge for new Assignment/Quiz
 */
export async function createFavoritesBar(settings: Settings, entities: EntityProtocol[]): Promise<void> {
    const defaultTab = document.querySelectorAll(".Mrphs-sitesNav__menuitem");
    const defaultTabCount = Object.keys(defaultTab).length;

    const courseMap = createCourseMap(entities);
    const dueMap = createDueMap(settings, courseMap);
    
    /**
     * -----------------------------------------------------------------
     * Modified by: roz
     * Date       : 2025-05-28
     * Changes    : コース名と色の対応を保存する配列を追加してデバッグ情報を出力
     * Category   : 機能拡張
     * -----------------------------------------------------------------
     */
    // コース名と色の対応を保存する配列
    const courseColorMapping: { courseName: string; courseId: string; color: string; category: DueCategory }[] = [];

    for (let j = 0; j < defaultTabCount; j++) {
        const aTag = defaultTab[j].getElementsByClassName("link-container")[0] as HTMLAnchorElement | undefined;
        const href = aTag?.href;
        const hrefContent = href?.match("(https?://[^/]+)/portal/site-?[a-z]*/([^/]+)");
        if (hrefContent === undefined || hrefContent === null) {
            continue;
        }
        const courseID = hrefContent[2];
        if (courseID === undefined) continue;
        const courseInfo = dueMap.get(courseID);
        if (courseInfo === undefined) continue;

        // コース名を取得
        const courseName = aTag?.textContent?.trim() || "不明なコース";
        const tabClass = dueCategoryClassMap[courseInfo.due];
        const aTagCount = defaultTab[j].getElementsByTagName("a").length;
        
        // コース名と色の対応を記録
        courseColorMapping.push({
            courseName,
            courseId: courseID,
            color: tabClass,
            category: courseInfo.due
        });
        // Apply color to course button
        for (let i = 0; i < aTagCount; i++) {
            defaultTab[j].getElementsByTagName("a")[i].classList.add(tabClass);
        }
        defaultTab[j].classList.add(tabClass);
        // Put notification badge
        if (!courseInfo.isRead) {
            defaultTab[j].classList.add("cs-notification-badge");
        }
    }
    
    /**
     * -----------------------------------------------------------------
     * Modified by: roz
     * Date       : 2025-05-28
     * Changes    : コース別の色割り当て情報をグローバル変数に保存
     * Category   : デバッグ機能
     * -----------------------------------------------------------------
     */
    // コース色情報を文字列として保存
    let colorInfoText = "";
    
    courseColorMapping.forEach(item => {
        const colorName = getColorName(item.color);
        const logText = `コース: ${item.courseName} (${item.courseId}) - 色: ${colorName} (カテゴリ: ${item.category})`;
        colorInfoText += logText + "\n";
    });
    
    // グローバル変数に保存して他のモジュールからアクセス可能にする
    courseColorInfo = colorInfoText;
}

export const resetFavoritesBar = (): void => {
    /**
     * -----------------------------------------------------------------
     * Modified by: roz
     * Date       : 2025-05-28
     * Changes    : cs-tab-defaultクラスをリセット対象に追加
     * Category   : バグ修正
     * -----------------------------------------------------------------
     */
    const classList = ["cs-notification-badge", "cs-tab-danger", "cs-tab-warning", "cs-tab-success", "cs-tab-other", "cs-tab-default"];
    for (const c of classList) {
        const q = document.querySelectorAll(`.${c}`);
        // @ts-ignore
        for (const _ of q) {
            _.classList.remove(`${c}`);
            _.style = "";
        }
    }
}