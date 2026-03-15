/**
 * TACT時間割管理機能
 * 時間割の取得・表示・管理を行う統合モジュール
 */
/**
 * 時間割表示機能
 * このモジュールはTACTポータルに時間割表示機能を追加します
 */

import { TimetableYearStorage, TimetableTermStorage, TimetableShowAllCoursesStorage } from "../../constant";
import { courseColorInfo } from "../../components/favoritesBar";
import { fromStorage, toStorage } from "../storage";
import { getStoredSettings } from "../setting/getSetting";
import { i18nMessage } from '../chrome/index';
import { createLogger } from '../../utils/logger';
import { getBaseURL } from "../api/fetch";
const logger = createLogger('timetable');

// 講義情報を格納する型
export interface CourseInfo {
    title: string;
    term: string;
    academicYear?: string; // 年度情報を明示的に保持
    dayPeriod: string[];  // ["月4", "木3"] のような形式
    url: string;
    room: string;
    instructor: string;
}


/**
 * キャッシュされた講義情報
 */
let cachedCourses: CourseInfo[] | null = null;
let cachedAllCourses: CourseInfo[] | null = null;
let showAllCourses = false;

/**
 * コースURLからsiteIdを抽出する
 */
function extractSiteId(url: string): string | null {
    // 例: https://tact.ac.thers.ac.jp/portal/site/xxxx-xxxx-xxxx
    //     https://tact.ac.thers.ac.jp/portal/site-reset/xxxx-xxxx
    const match = url.match(/\/portal\/site-?[a-z]*\/([^\/\?#]+)/);
    return match ? match[1] : null;
}

/**
 * サイト説明文から教員名を抽出する
 * 形式例: "...情報ネットワーク(2025年度秋/火２限)/Communication Networks(2025,Fall/Tue2)(河口 信夫/KAWAGUCHI Nobuo)(0846..."
 * → "河口 信夫"
 */
function parseInstructorFromDescription(description: string): string {
    if (!description) return '';
    // (日本語名/ENGLISH NAME) のパターンを探す
    // スケジュール括弧 (年度.../...) を除外するため、年度・数字始まりでないものをマッチ
    const matches = description.match(/\(([^()]+?)\/([A-Z][A-Za-z\s]+)\)/g);
    if (!matches) return '';
    for (const m of matches) {
        const inner = m.slice(1, -1); // 括弧を除去
        // 年度やスケジュール情報を除外
        if (inner.match(/^\d/) || inner.includes('年度')) continue;
        // "日本語名/ENGLISH NAME" の日本語部分を返す
        const parts = inner.split('/');
        if (parts.length >= 2 && parts[1].match(/^[A-Z]/)) {
            return parts[0].trim();
        }
    }
    return '';
}

/**
 * TACT REST APIから教員情報を取得してコース情報を補完する
 */
async function enrichCoursesWithInstructor(courses: CourseInfo[]): Promise<CourseInfo[]> {
    const baseURL = getBaseURL();
    if (!baseURL) {
        logger.warn('教員情報取得: baseURLが取得できません');
        return courses;
    }

    const targets = courses
        .filter(c => !c.instructor)
        .map(c => ({ course: c, siteId: extractSiteId(c.url) }))
        .filter(x => x.siteId !== null);

    logger.debug(`教員情報取得: ${targets.length}件のコースを処理`);

    // 並列で取得（最大5件ずつバッチ処理）
    const batchSize = 5;
    for (let i = 0; i < targets.length; i += batchSize) {
        const batch = targets.slice(i, i + batchSize);
        await Promise.all(batch.map(async ({ course, siteId }) => {
            try {
                const url = `${baseURL}/direct/site/${siteId}.json`;
                const resp = await fetch(url);
                if (!resp.ok) {
                    logger.warn(`教員情報取得失敗: ${resp.status} for ${siteId}`);
                    return;
                }
                const data = await resp.json();
                // 1. サイト説明文から教員名をパース
                const fromDesc = parseInstructorFromDescription(data.description || '')
                    || parseInstructorFromDescription(data.shortDescription || '');
                if (fromDesc) {
                    course.instructor = fromDesc;
                    logger.debug(`教員名取得成功(説明文): ${course.title} → ${fromDesc}`);
                    return;
                }
                // 2. contactNameフォールバック
                if (data.contactName) {
                    course.instructor = data.contactName;
                    logger.debug(`教員名取得成功(contactName): ${course.title} → ${data.contactName}`);
                    return;
                }
                logger.debug(`教員名なし: ${course.title}`);
            } catch (e) {
                logger.warn(`教員情報取得エラー: ${siteId}`, e);
            }
        }));
    }
    return courses;
}

/**
 * 保存された時間割設定を読み込む
 * @param hostname サイトのホスト名
 * @returns 年度と学期の設定情報
 */
async function loadTimetableSettings(hostname: string): Promise<{year: string, term: string, showAll: boolean}> {
    // LocalStorageから年度と学期の設定を読み込む
    const savedYear = await fromStorage<string | undefined>(hostname, TimetableYearStorage,
        (data: any) => data === undefined ? undefined : String(data));

    const savedTerm = await fromStorage<string | undefined>(hostname, TimetableTermStorage,
        (data: any) => data === undefined ? undefined : String(data));

    const savedShowAll = await fromStorage<boolean>(hostname, TimetableShowAllCoursesStorage,
        (data: any) => data === true);

    // 現在の年度をデフォルト値として使用
    const currentYear = new Date().getFullYear();
    const currentYearStr = currentYear.toString();

    // 保存された年度が古すぎる場合（5年以上前）は現在の年度を使用
    let finalYear = currentYearStr;
    if (savedYear) {
        const savedYearNum = parseInt(savedYear);
        if (!isNaN(savedYearNum) && savedYearNum >= currentYear - 5) {
            finalYear = savedYear;
        } else {
            logger.warn(`保存された年度 ${savedYear} が古すぎるため、現在の年度 ${currentYearStr} を使用します。`);
        }
    }

    logger.debug(`設定読み込み - 保存年度: ${savedYear}, 保存学期: ${savedTerm}, 最終年度: ${finalYear}, 全コース表示: ${savedShowAll}`);

    // 学期値のバリデーション
    const validTerms = ['spring', 'spring-1', 'spring-2', 'fall', 'fall-1', 'fall-2'];
    const finalTerm = savedTerm && validTerms.includes(savedTerm) ? savedTerm : 'spring';

    return {
        year: finalYear,
        term: finalTerm,
        showAll: savedShowAll
    };
}

/**
 * 時間割設定を保存する
 * @param hostname サイトのホスト名
 * @param year 年度
 * @param term 学期
 */
async function saveTimetableSettings(hostname: string, year: string, term: string): Promise<void> {
    // 年度と学期の設定をLocalStorageに保存
    await toStorage(hostname, TimetableYearStorage, year);
    await toStorage(hostname, TimetableTermStorage, term);
    logger.debug(`時間割設定を保存しました - 年度: ${year}, 学期: ${term}`);
}

async function saveShowAllCourses(hostname: string, showAll: boolean): Promise<void> {
    await toStorage(hostname, TimetableShowAllCoursesStorage, showAll);
    logger.debug(`全コース表示設定を保存しました: ${showAll}`);
}

// 教室情報のストレージキー
const ClassroomStorageKey = 'cs-timetable-classrooms';

// 教室情報の保存・取得
async function saveClassroomInfo(hostname: string, data: Record<string, string>) {
    await toStorage(hostname, ClassroomStorageKey, data);
}
async function loadClassroomInfo(hostname: string): Promise<Record<string, string>> {
    const result = await fromStorage<Record<string, string> | undefined>(hostname, ClassroomStorageKey, d => d || {});
    return result || {};
}

// 教室編集モーダル
function showClassroomEditModal() {
    const hostname = window.location.hostname;
    const modal = document.createElement('div');
    modal.className = 'cs-tact-modal cs-timetable-modal';
    modal.style.zIndex = '10001';
    const header = document.createElement('div');
    header.className = 'cs-tact-modal-header';
    const title = document.createElement('h2');
    title.textContent = '教室編集';
    header.appendChild(title);
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.className = 'cs-tact-modal-close';
    closeBtn.onclick = () => modal.remove();
    header.appendChild(closeBtn);
    modal.appendChild(header);
    const content = document.createElement('div');
    content.className = 'cs-tact-modal-content';
    content.style.maxHeight = '60vh';
    content.style.overflowY = 'auto';
    // 講義リスト
    const courses = cachedCourses || [];
    loadClassroomInfo(hostname).then(classroomMap => {
        courses.forEach(course => {
            const row = document.createElement('div');
            row.style.display = 'flex';
            row.style.alignItems = 'center';
            row.style.marginBottom = '8px';
            const label = document.createElement('span');
            label.textContent = course.title.split('(')[0];
            label.style.flex = '0 0 200px';
            label.style.fontWeight = 'bold';
            row.appendChild(label);
            const input = document.createElement('input');
            input.type = 'text';
            input.value = classroomMap[course.title] || course.room || '';
            input.style.flex = '1';
            input.style.marginLeft = '8px';
            input.placeholder = '教室名を入力';
            row.appendChild(input);
            row.dataset.title = course.title;
            content.appendChild(row);
        });
        // 保存ボタン
        const saveBtn = document.createElement('button');
        saveBtn.textContent = '保存';
        saveBtn.className = 'cs-btn cs-btn-primary';
        saveBtn.style.marginTop = '16px';
        saveBtn.onclick = async () => {
            const newMap: Record<string, string> = {};
            content.querySelectorAll('div[data-title]')?.forEach(row => {
                const t = row.getAttribute('data-title')!;
                const val = (row.querySelector('input') as HTMLInputElement).value.trim();
                if (val) newMap[t] = val;
            });
            await saveClassroomInfo(hostname, newMap);
            modal.remove();
            updateTimetable();
        };
        content.appendChild(saveBtn);
    });
    modal.appendChild(content);
    document.body.appendChild(modal);
}

export const showTimetableModal = (): void => {
    // 既存のモーダルがあれば削除
    const existingModal = document.querySelector('.cs-tact-modal');
    if (existingModal) {
        existingModal.remove();
    }

    // モーダル再表示時にキャッシュをクリアして最新のDOM状態を反映
    cachedCourses = null;
    cachedAllCourses = null;
    
    // 現在のホスト名を取得
    const currentHostname = window.location.hostname;

    // モーダルコンテナを作成
    const modalContainer = document.createElement('div');
    modalContainer.className = 'cs-tact-modal cs-timetable-modal';
    
    // 色設定を時間割モーダルに適用
    const applyTimetableColors = async () => {
        try {
            const settings = await getStoredSettings(currentHostname);
            for (const colorName of Object.getOwnPropertyNames(settings.color)) {
                // @ts-ignore
                const color = settings.color[colorName];
                modalContainer.style.setProperty(`--${colorName}`, color);
            }
            modalContainer.style.setProperty("--textColor", settings.getTextColor());
            modalContainer.style.setProperty("--bgColor", settings.getBgColor());
            modalContainer.style.setProperty("--dateColor", settings.getDateColor());
            logger.debug(i18nMessage('color_settings_applied'));
        } catch (error) {
            logger.error(i18nMessage('color_settings_apply_failed'), error);
        }
    };
    
    applyTimetableColors();
    
    // モーダルのヘッダー
    const modalHeader = document.createElement('div');
    modalHeader.className = 'cs-tact-modal-header';
    
    const modalTitle = document.createElement('h2');
    modalTitle.textContent = '時間割表示';
    modalHeader.appendChild(modalTitle);
    
    const closeButton = document.createElement('button');
    closeButton.textContent = '×';
    closeButton.className = 'cs-tact-modal-close';
    closeButton.addEventListener('click', () => modalContainer.remove());
    modalHeader.appendChild(closeButton);
    
    // モーダルのコンテンツ
    const modalContent = document.createElement('div');
    modalContent.className = 'cs-tact-modal-content';

    // 時間割コンテナ
    const timetableContainer = document.createElement('div');
    timetableContainer.className = 'cs-timetable-container';
    
    // 年度と学期の選択部分
    const selectors = document.createElement('div');
    selectors.className = 'cs-timetable-selectors';
    
    // 年度選択
    const yearSelector = document.createElement('div');
    yearSelector.className = 'cs-timetable-selector';
    
    const yearLabel = document.createElement('label');
    yearLabel.textContent = i18nMessage('timetable_year');
    yearSelector.appendChild(yearLabel);
    
    const yearSelect = document.createElement('select');
    yearSelect.id = 'cs-timetable-year';
    
    // 現在の年から前後5年の選択肢を追加（範囲を拡大）
    const currentYear = new Date().getFullYear();
    for (let year = currentYear - 5; year <= currentYear + 2; year++) {
        const option = document.createElement('option');
        option.value = String(year);
        option.textContent = `${year}年`;
        yearSelect.appendChild(option);
    }
    
    // 学期選択
    const termSelector = document.createElement('div');
    termSelector.className = 'cs-timetable-selector';
    
    const termLabel = document.createElement('label');
    termLabel.textContent = i18nMessage('timetable_semester');
    termSelector.appendChild(termLabel);
    
    const termSelect = document.createElement('select');
    termSelect.id = 'cs-timetable-term';
    
    const terms = [
        { value: 'spring', text: i18nMessage('timetable_semester_spring') },
        { value: 'spring-1', text: i18nMessage('timetable_semester_spring_1') },
        { value: 'spring-2', text: i18nMessage('timetable_semester_spring_2') },
        { value: 'fall', text: i18nMessage('timetable_semester_fall') },
        { value: 'fall-1', text: i18nMessage('timetable_semester_fall_1') },
        { value: 'fall-2', text: i18nMessage('timetable_semester_fall_2') }
    ];
    
    terms.forEach(term => {
        const option = document.createElement('option');
        option.value = term.value;
        option.textContent = term.text;
        termSelect.appendChild(option);
    });
    
    // 保存されている設定を読み込む
    const currentSiteHostname = window.location.hostname;
    loadTimetableSettings(currentSiteHostname).then(settings => {
        logger.debug(`読み込まれた設定 - 年度: ${settings.year}, 学期: ${settings.term}, 全コース表示: ${settings.showAll}`);

        // 全コース表示の設定を反映
        showAllCourses = settings.showAll;
        const toggleBtn = document.getElementById('cs-timetable-show-all') as HTMLButtonElement | null;
        if (toggleBtn) {
            toggleBtn.textContent = showAllCourses ? '全コース' : 'お気に入りのみ';
            toggleBtn.className = 'cs-btn ' + (showAllCourses ? 'cs-btn-primary' : 'cs-btn-secondary');
        } else {
            logger.warn('トグルボタンが見つかりません。DOMタイミングの問題の可能性があります');
        }

        // 年度セレクトボックスを設定
        let yearFound = false;
        for (let i = 0; i < yearSelect.options.length; i++) {
            if (yearSelect.options[i].value === settings.year) {
                yearSelect.selectedIndex = i;
                yearFound = true;
                break;
            }
        }
        
        // 保存された年度がセレクトボックスにない場合、現在の年度を選択
        if (!yearFound) {
            logger.warn(`保存された年度 ${settings.year} がセレクトボックスにありません。現在の年度 ${currentYear} を選択します。`);
            for (let i = 0; i < yearSelect.options.length; i++) {
                if (yearSelect.options[i].value === String(currentYear)) {
                    yearSelect.selectedIndex = i;
                    break;
                }
            }
        }
        
        // 学期セレクトボックスを設定
        let termFound = false;
        for (let i = 0; i < termSelect.options.length; i++) {
            if (termSelect.options[i].value === settings.term) {
                termSelect.selectedIndex = i;
                termFound = true;
                break;
            }
        }
        
        // 保存された学期がセレクトボックスにない場合、デフォルト学期を選択
        if (!termFound) {
            logger.warn(`保存された学期 ${settings.term} がセレクトボックスにありません。デフォルト学期 'spring' を選択します。`);
            for (let i = 0; i < termSelect.options.length; i++) {
                if (termSelect.options[i].value === 'spring') {
                    termSelect.selectedIndex = i;
                    break;
                }
            }
        }
        
        // セレクトボックス設定完了後に初期表示を実行
        logger.debug('初期時間割表示を開始します');
        
        // 講義情報の事前取得を試みる
        if (!cachedCourses) {
            try {
                let courses = fetchCoursesFromPortal();
                if (!courses || courses.length === 0) {
                    courses = extractCoursesFromPage();
                }
                if (courses && courses.length > 0) {
                    cachedCourses = courses;
                    logger.debug('講義情報をキャッシュしました:', cachedCourses);
                }
            } catch (error) {
                logger.error('講義情報取得エラー:', error);
            }
        }
        // 全コース情報も事前取得
        if (!cachedAllCourses) {
            try {
                const allCourses = fetchAllCoursesFromAllSites();
                if (allCourses && allCourses.length > 0) {
                    cachedAllCourses = allCourses;
                    logger.debug('全講義情報をキャッシュしました:', cachedAllCourses);
                }
            } catch (error) {
                logger.error('全講義情報取得エラー:', error);
            }
        }
        
        updateTimetable();
    }).catch(error => {
        logger.error('設定読み込みエラー:', error);
        // エラーの場合でもデフォルト表示を実行
        updateTimetable();
    });
    
    // イベントリスナー設定
    yearSelect.addEventListener('change', updateTimetable);
    termSelect.addEventListener('change', updateTimetable);
    
    yearSelector.appendChild(yearSelect);
    selectors.appendChild(yearSelector);
    
    termSelector.appendChild(termSelect);
    selectors.appendChild(termSelector);

    // お気に入り/全コース切り替えトグル
    const showAllToggle = document.createElement('button');
    showAllToggle.id = 'cs-timetable-show-all';
    showAllToggle.className = 'cs-btn ' + (showAllCourses ? 'cs-btn-primary' : 'cs-btn-secondary');
    showAllToggle.textContent = showAllCourses ? '全コース' : 'お気に入りのみ';
    showAllToggle.style.marginLeft = '12px';
    showAllToggle.onclick = () => {
        showAllCourses = !showAllCourses;
        showAllToggle.textContent = showAllCourses ? '全コース' : 'お気に入りのみ';
        showAllToggle.className = 'cs-btn ' + (showAllCourses ? 'cs-btn-primary' : 'cs-btn-secondary');
        saveShowAllCourses(window.location.hostname, showAllCourses);
        updateTimetable();
    };
    selectors.appendChild(showAllToggle);

    // 教室編集ボタン追加
    const classroomEditBtn = document.createElement('button');
    classroomEditBtn.textContent = '教室編集';
    classroomEditBtn.className = 'cs-btn cs-btn-secondary';
    classroomEditBtn.style.marginLeft = '12px';
    classroomEditBtn.onclick = showClassroomEditModal;
    selectors.appendChild(classroomEditBtn);
    
    // PNG出力ボタン追加
    const pngExportBtn = document.createElement('button');
    pngExportBtn.textContent = 'プレビュー';
    pngExportBtn.className = 'cs-btn cs-btn-primary';
    pngExportBtn.style.marginLeft = '12px';
    pngExportBtn.onclick = showCourseColorModal;
    selectors.appendChild(pngExportBtn);
    
    timetableContainer.appendChild(selectors);
    
    // 時間割表示部分
    const timetableDiv = document.createElement('div');
    timetableDiv.id = 'cs-timetable';
    
    // 初期ロード中表示
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'cs-timetable-loading';
    loadingDiv.style.textAlign = 'center';
    loadingDiv.style.padding = '40px 20px';
    loadingDiv.style.color = '#666';
    loadingDiv.innerHTML = '<p>時間割を読み込み中...</p>';
    timetableDiv.appendChild(loadingDiv);
    
    timetableContainer.appendChild(timetableDiv);
    
    modalContent.appendChild(timetableContainer);
    
    // モーダルを組み立てる
    modalContainer.appendChild(modalHeader);
    modalContainer.appendChild(modalContent);
    
    // ページにモーダルを追加
    document.body.appendChild(modalContainer);
    
    // 年度・学期選択のデバッグ表示
    yearSelect.addEventListener('change', () => {
        logger.debug(`年度選択変更: ${yearSelect.value}`);
    });
    
    termSelect.addEventListener('change', () => {
        logger.debug(`学期選択変更: ${termSelect.value}`);
    });
};

/**
 * TACTポータルから実際の講義情報を取得
 * @returns 講義情報の配列
 */
function fetchCoursesFromPortal(): CourseInfo[] {
    const courses: CourseInfo[] = [];
    
    // デバッグメッセージ
    logger.debug('時間割情報を取得中...');
    
    // より具体的なセレクタを使用（クラス名を複数指定）
    const courseLinks = document.querySelectorAll('a.link-container[title]');
    logger.debug('取得した講義リンク数:', courseLinks.length);
    
    if (courseLinks.length === 0) {
        // 別のセレクタも試してみる
        const altCourseLinks = document.querySelectorAll('.link-container');
        logger.debug('代替セレクタで取得した講義リンク数:', altCourseLinks.length);
        
        // デバッグ用に最初の数個の要素を表示
        for (let i = 0; i < Math.min(5, altCourseLinks.length); i++) {
            const el = altCourseLinks[i];
            logger.debug(`リンク${i}:`, el.tagName, el.className, el.textContent?.slice(0, 30));
        }
    }
    
    // DOM全体をデバッグ出力（講義情報を含む可能性のある部分）
    const mainContent = document.querySelector('#content') || document.body;
    logger.debug('メインコンテンツ内のHTMLサンプル:', 
               mainContent.innerHTML.slice(0, 500) + '...');
    
    courseLinks.forEach((link, index) => {
        const courseLink = link as HTMLAnchorElement;
        let courseTitle = '';
        
        // span内のテキストまたはtitle属性から情報を取得
        const spanText = courseLink.querySelector('span')?.textContent?.trim();
        const titleAttr = courseLink.getAttribute('title');
        
        courseTitle = spanText || titleAttr || '';
        
        logger.debug(`講義${index}: ${courseTitle}`);
        
        if (courseTitle && courseLink.href) {
            // タイトルから情報を抽出 例: "固体電子工学及び演習(2025年度春/月４限,木３限)"
            // 複数のパターンに対応できるよう、より柔軟な正規表現を使用
            const titleMatch = courseTitle.match(/(.+)\((\d{4})年度(.+)[\\/](.+)\)/);
            
            if (titleMatch) {
                const title = titleMatch[1].trim();
                const year = titleMatch[2];
                const term = titleMatch[3].trim();
                const periodInfo = titleMatch[4].trim();
                
                logger.debug(`解析 - 講義名: ${title}, 年度: ${year}, 学期: ${term}, 時限: ${periodInfo}`);
                
                // 曜日と時限の情報を抽出 例: "月４限,木３限"
                const dayPeriods = periodInfo.split(',').map(dp => {
                    // 漢数字を算用数字に変換
                    return dp.replace(/([月火水木金土日])([一二三四五六七八九十]+)限/, (_, day, period) => {
                        const periodMap: { [key: string]: string } = {
                            '一': '1', '二': '2', '三': '3', '四': '4', '五': '5',
                            '六': '6', '七': '7', '八': '8', '九': '9', '十': '10'
                        };
                        return day + (periodMap[period] || period);
                    }).replace(/([月火水木金土日])([０-９]+)限/, (_, day, period) => {
                        // 全角数字を半角数字に変換
                        return day + period.replace(/[０-９]/g, (s: string) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0));
                    });
                });
                
                logger.debug('変換後の曜日時限:', dayPeriods);
                
                courses.push({
                    title,
                    term,
                    academicYear: year, // 年度情報を明示的に保存
                    dayPeriod: dayPeriods,
                    url: courseLink.href,
                    room: '', // ポータルからは取得できないため空欄
                    instructor: '' // ポータルからは取得できないため空欄
                });
            } else {
                logger.debug(`講義情報の正規表現マッチに失敗: ${courseTitle}`);
            }
        }
    });
    
    logger.debug('取得した講義情報', courses);
    return courses;
}

/**
 * ページ内の要素から講義情報を抽出する
 */
function extractCoursesFromPage(): CourseInfo[] {
    const extractedCourses: CourseInfo[] = [];
    logger.debug('ページから講義情報を抽出中...');
    
    try {
        // 方法1: titleを含むリンク要素を検索
        const linkElements = document.querySelectorAll('a[title*="限"]');
        logger.debug('見つかったリンク数:', linkElements.length);
        
        if (linkElements.length > 0) {
            linkElements.forEach((link, index) => {
                const anchorEl = link as HTMLAnchorElement;
                const title = anchorEl.title;
                const href = anchorEl.href;
                const span = anchorEl.querySelector('span');
                const text = span ? span.textContent : anchorEl.textContent;
                
                logger.debug(`リンク${index}:`, title, href, text);
                
                if (title && title.includes('限') && href) {
                    try {
                        // タイトルから情報を抽出 例: "固体電子工学及び演習(2025年度春/月４限,木３限)"
                        const titleMatch = title.match(/(.+)\((\d{4})年度(.+)[\\/](.+)\)/);
                        
                        if (titleMatch) {
                            const courseTitle = titleMatch[1].trim();
                            const year = titleMatch[2];
                            const courseTerm = titleMatch[3].trim();
                            const periodInfo = titleMatch[4].trim();
                            
                            // デバッグ情報
                            logger.debug(`抽出成功 - タイトル: ${courseTitle}, 年度: ${year}, 学期: ${courseTerm}`); 
                            
                            // 曜日と時限情報の変換処理
                            const dayPeriods = periodInfo.split(',').map(dp => {
                                return dp.replace(/([１２３４５６７８９０]+|[一二三四五六七八九十]+|[0-9]+)限/, (match, num) => {
                                    // 漢数字と全角数字を半角数字に変換
                                    const conversion: {[key: string]: string} = {
                                        '一': '1', '二': '2', '三': '3', '四': '4', '五': '5',
                                        '六': '6', '七': '7', '八': '8', '九': '9', '十': '10',
                                        '１': '1', '２': '2', '３': '3', '４': '4', '５': '5',
                                        '６': '6', '７': '7', '８': '8', '９': '9', '０': '0'
                                    };
                                    
                                    let period = '';
                                    for (let i = 0; i < num.length; i++) {
                                        period += conversion[num[i]] || num[i];
                                    }
                                    
                                    return period;
                                });
                            });
                            
                            extractedCourses.push({
                                title: courseTitle,
                                term: courseTerm,
                                academicYear: year, // 年度情報を明示的に保存
                                dayPeriod: dayPeriods,
                                url: href,
                                room: '',
                                instructor: ''
                            });
                        }
                    } catch (e) {
                        logger.error('抽出エラー:', e);
                    }
                }
            });
        }
        
        // 方法2: クラス名から検索
        if (extractedCourses.length === 0) {
            const classElements = document.querySelectorAll('.link-container');
            logger.debug('クラス名から見つかった要素数:', classElements.length);
            
            classElements.forEach((element, index) => {
                if (element instanceof HTMLAnchorElement) {
                    const href = element.href;
                    const title = element.title || '';
                    const text = element.textContent || '';
                    
                    // タイトルまたはテキストから講義情報を抽出
                    const content = title || text;
                    const match = content.match(/(.+)\((\d{4})年度(.+)[\\/](.+)\)/);
                    
                    if (match) {
                        const courseTitle = match[1].trim();
                        const year = match[2];
                        const term = match[3].trim();
                        const periodInfo = match[4].trim();
                        
                        logger.debug(`クラス名から抽出 - タイトル: ${courseTitle}, 年度: ${year}, 学期: ${term}`);
                        
                        const dayPeriods = periodInfo.split(',').map(dp => {
                            return dp.replace(/([１２３４５６７８９０]+|[一二三四五六七八九十]+|[0-9]+)限/, (m, num) => {
                                // 数字変換処理
                                const conversion: {[key: string]: string} = {
                                    '一': '1', '二': '2', '三': '3', '四': '4', '五': '5',
                                    '六': '6', '七': '7', '八': '8', '九': '9', '十': '10',
                                    '１': '1', '２': '2', '３': '3', '４': '4', '５': '5',
                                    '６': '6', '７': '7', '８': '8', '９': '9', '０': '0'
                                };
                                
                                let period = '';
                                for (let i = 0; i < num.length; i++) {
                                    period += conversion[num[i]] || num[i];
                                }
                                
                                return period;
                            });
                        });
                        
                        extractedCourses.push({
                            title: courseTitle,
                            term,
                            academicYear: year, // 年度情報を明示的に保存
                            dayPeriod: dayPeriods,
                            url: href,
                            room: '',
                            instructor: ''
                        });
                    }
                }
            });
        }
        
        // データが見つからない場合は空配列を返す
        if (extractedCourses.length === 0) {
            logger.warn('講義情報が見つかりませんでした');
            return [];
        }
    } catch (e) {
        logger.error('講義情報抽出エラー:', e);
        return [];
    }
    
    logger.debug('抽出した講義情報:', extractedCourses);
    return extractedCourses;
}

/**
 * 「全サイト」モーダル(.fav-sites-entry)からお気に入り以外も含む全コースを取得
 */
function fetchAllCoursesFromAllSites(): CourseInfo[] {
    const allCourses: CourseInfo[] = [];
    const entries = document.querySelectorAll('.fav-sites-entry');
    logger.debug('全サイトエントリ数:', entries.length);

    entries.forEach((entry) => {
        const anchor = entry.querySelector('.fav-title a') as HTMLAnchorElement | null;
        if (!anchor) return;

        const title = anchor.title || anchor.textContent?.trim() || '';
        const href = anchor.href;
        if (!title || !href) return;

        const titleMatch = title.match(/(.+)\((\d{4})年度(.+)[\/\\](.+)\)/);
        if (!titleMatch) return;

        const courseTitle = titleMatch[1].trim();
        const year = titleMatch[2];
        const term = titleMatch[3].trim();
        const periodInfo = titleMatch[4].trim();

        const dayPeriods = periodInfo.split(',').map(dp => {
            return dp.replace(/([月火水木金土日])([一二三四五六七八九十]+)限/, (_, day, period) => {
                const periodMap: { [key: string]: string } = {
                    '一': '1', '二': '2', '三': '3', '四': '4', '五': '5',
                    '六': '6', '七': '7', '八': '8', '九': '9', '十': '10'
                };
                return day + (periodMap[period] || period);
            }).replace(/([月火水木金土日])([０-９]+)限/, (_, day, period) => {
                return day + period.replace(/[０-９]/g, (s: string) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0));
            }).replace(/([月火水木金土日])([１２３４５６７８９０]+|[0-9]+)限/, (m, dayChar, num) => {
                const conversion: {[key: string]: string} = {
                    '１': '1', '２': '2', '３': '3', '４': '4', '５': '5',
                    '６': '6', '７': '7', '８': '8', '９': '9', '０': '0'
                };
                let period = '';
                for (let i = 0; i < num.length; i++) {
                    period += conversion[num[i]] || num[i];
                }
                return dayChar + period;
            });
        });

        allCourses.push({
            title: courseTitle,
            term,
            academicYear: year,
            dayPeriod: dayPeriods,
            url: href,
            room: '',
            instructor: ''
        });
    });

    logger.debug('全サイトから取得した講義情報:', allCourses);
    return allCourses;
}

/**
 * 学期の表記を標準化
 */
export function normalizeTerm(term: string): string {
    // 空白とカタカナ、ひらがなの違いを無視して比較するため小文字に変換
    const normalizedTerm = term.toLowerCase();
    
    if (normalizedTerm.includes('春') || normalizedTerm.includes('前期') || normalizedTerm.includes('spring')) {
        // 'ii' を 'i' より先にチェック（'ii'.includes('i') === true のため）
        if (normalizedTerm.includes('ii') || normalizedTerm.includes('ⅱ') || normalizedTerm.includes('２') ||
            normalizedTerm.includes('2') || normalizedTerm.includes('二'))
            return 'spring-2';
        if (normalizedTerm.includes('i') || normalizedTerm.includes('ⅰ') || normalizedTerm.includes('１') ||
            normalizedTerm.includes('1') || normalizedTerm.includes('一'))
            return 'spring-1';
        return 'spring';
    }
    if (normalizedTerm.includes('秋') || normalizedTerm.includes('後期') || normalizedTerm.includes('fall')) {
        if (normalizedTerm.includes('ii') || normalizedTerm.includes('ⅱ') || normalizedTerm.includes('２') ||
            normalizedTerm.includes('2') || normalizedTerm.includes('二'))
            return 'fall-2';
        if (normalizedTerm.includes('i') || normalizedTerm.includes('ⅰ') || normalizedTerm.includes('１') ||
            normalizedTerm.includes('1') || normalizedTerm.includes('一'))
            return 'fall-1';
        return 'fall';
    }
    return 'spring'; // デフォルト
}

/**
 * コース色情報からコース名とカテゴリ情報を抽出する
 * @returns {Map<string, string>} コース名をキーに、カテゴリ情報を値とするマップ
 */
function extractCourseCategories(): Map<string, string> {
    // コース名とカテゴリのマップを作成
    const courseCategoryMap = new Map<string, string>();
    
    // courseColorInfoが存在しないか空の場合は空のマップを返す
    if (!courseColorInfo) {
        return courseCategoryMap;
    }
    
    // 各行を処理
    const lines = courseColorInfo.split('\n');
    for (const line of lines) {
        // "コース: "で始まる行を処理
        if (line.startsWith('コース:')) {
            // カテゴリ情報を抽出
            const categoryMatch = line.match(/カテゴリ: ([a-zA-Z0-9]+)/);
            if (!categoryMatch) continue;
            
            const category = categoryMatch[1];
            
            // コース名を抽出 - 括弧の前までの文字列を取得
            let courseName = line.substring(line.indexOf(':') + 1, line.indexOf('(')).trim();
            
            // コース名とカテゴリをマップに追加
            courseCategoryMap.set(courseName, category);
        }
    }
    
    return courseCategoryMap;
}

/**
 * 年度・学期でコースをフィルタリングする共通関数
 */
function filterCoursesByYearAndTerm(courses: CourseInfo[], year: string, term: string): CourseInfo[] {
    return courses.filter(course => {
        let courseYear = course.academicYear || "";
        if (!courseYear) {
            const yearRegexMatch = course.title.match(/\((\d{4})年度/);
            if (yearRegexMatch && yearRegexMatch[1]) {
                courseYear = yearRegexMatch[1];
            } else if (course.term && course.term.match(/(\d{4})年/)) {
                const termYearMatch = course.term.match(/(\d{4})年/);
                if (termYearMatch && termYearMatch[1]) {
                    courseYear = termYearMatch[1];
                }
            }
        }
        let isYearMatching = courseYear === year;
        if (!courseYear) {
            isYearMatching = true;
        }
        const normalizedCourseTerm = normalizeTerm(course.term);
        const normalizedSelectedTerm = term;
        const courseTermBase = normalizedCourseTerm.split('-')[0];
        const selectedTermBase = normalizedSelectedTerm.split('-')[0];
        let termMatch = false;
        if (normalizedCourseTerm === normalizedSelectedTerm) {
            termMatch = true;
        } else if (courseTermBase === selectedTermBase && !normalizedSelectedTerm.includes('-')) {
            termMatch = true;
        } else if (courseTermBase === selectedTermBase && !normalizedCourseTerm.includes('-')) {
            termMatch = true;
        }
        return isYearMatching && termMatch;
    });
}

// --- Canvas 描画ヘルパー ---

function hexToRgba(hex: string, a: number): string {
    if (!hex || hex.length < 7 || hex[0] !== '#') return `rgba(170,170,170,${a})`;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    if (isNaN(r) || isNaN(g) || isNaN(b)) return `rgba(170,170,170,${a})`;
    return `rgba(${r},${g},${b},${a})`;
}

function darkenHex(hex: string, amount: number): string {
    if (!hex || hex.length < 7 || hex[0] !== '#') return 'rgb(110,110,110)';
    const r = Math.round(parseInt(hex.slice(1, 3), 16) * (1 - amount));
    const g = Math.round(parseInt(hex.slice(3, 5), 16) * (1 - amount));
    const b = Math.round(parseInt(hex.slice(5, 7), 16) * (1 - amount));
    if (isNaN(r) || isNaN(g) || isNaN(b)) return 'rgb(110,110,110)';
    return `rgb(${r},${g},${b})`;
}

function truncateText(ctx: CanvasRenderingContext2D, text: string, maxW: number): string {
    if (ctx.measureText(text).width <= maxW) return text;
    for (let i = text.length - 1; i > 0; i--) {
        const t = text.slice(0, i) + '…';
        if (ctx.measureText(t).width <= maxW) return t;
    }
    return '…';
}

function drawWrappedText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number,
    maxLines: number
): number {
    if (!text) return 0;
    let line = '';
    let drawn = 0;
    for (let i = 0; i < text.length; i++) {
        const test = line + text[i];
        if (ctx.measureText(test).width > maxWidth && line.length > 0) {
            if (drawn >= maxLines - 1) {
                const rest = line + text.slice(i);
                ctx.fillText(truncateText(ctx, rest, maxWidth), x, y + drawn * lineHeight);
                return drawn + 1;
            }
            ctx.fillText(line, x, y + drawn * lineHeight);
            line = text[i];
            drawn++;
        } else {
            line = test;
        }
    }
    ctx.fillText(line, x, y + drawn * lineHeight);
    return drawn + 1;
}

function canvasRoundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

// アスペクト比プリセット
const ASPECT_PRESETS: Record<string, { w: number; h: number; label: string }> = {
    '9:16':  { w: 420,  h: 748,  label: '9:16 スマホ' },
    '3:4':   { w: 540,  h: 720,  label: '3:4 タブレット' },
    '1:1':   { w: 660,  h: 660,  label: '1:1 正方形' },
    '16:9':  { w: 1120, h: 630,  label: '16:9 横長' },
};

/**
 * 時間割を Canvas に描画して返す
 */
function renderTimetableToCanvas(
    timetable: CourseInfo[][][],
    days: string[],
    periodCount: number,
    colorMap: Record<string, string>,
    classroomMap: Record<string, string>,
    year: string,
    termLabel: string,
    aspectKey: string,
    periodTimes: string[],
): HTMLCanvasElement | null {
    if (!days.length || !periodCount) return null;
    const preset = ASPECT_PRESETS[aspectKey] || ASPECT_PRESETS['9:16'];
    const dpr = Math.max(window.devicePixelRatio || 1, 2);
    const canvasW = preset.w;
    const canvasH = preset.h;

    const canvas = document.createElement('canvas');
    canvas.width = canvasW * dpr;
    canvas.height = canvasH * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.scale(dpr, dpr);

    const margin = 14;
    const titleBarH = 46;
    const headerH = 30;
    const periodColW = 52; // 時間表示のため幅を拡大
    const gap = 3;
    const font = '"Hiragino Sans", "Noto Sans JP", "Meiryo", sans-serif';

    const gridLeft = margin + periodColW;
    const gridTop = margin + titleBarH + headerH;
    const cellW = (canvasW - margin * 2 - periodColW - gap * (days.length - 1)) / days.length;
    const cellH = (canvasH - margin * 2 - titleBarH - headerH - gap * (periodCount - 1)) / periodCount;

    // フォントサイズをセル幅に応じて調整
    const titleFontSize = cellW < 90 ? 10 : cellW < 110 ? 11 : 12;
    const subFontSize = cellW < 90 ? 9 : cellW < 110 ? 10 : 11;
    const titleLH = titleFontSize + 3;
    const subLH = subFontSize + 3;
    const titleMaxLines = cellH < 110 ? 2 : 3;
    const roomMaxLines = cellH < 110 ? 1 : 2;
    const titleSize = canvasW < 500 ? 16 : 18;

    // 背景カード
    canvasRoundRect(ctx, margin - 2, margin - 2, canvasW - margin * 2 + 4, canvasH - margin * 2 + 4, 14);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    // タイトル
    ctx.fillStyle = '#1a1a1a';
    ctx.font = `bold ${titleSize}px ${font}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${year}年度  ${termLabel}`, canvasW / 2, margin + titleBarH / 2);

    // 曜日ヘッダー
    const headerY = margin + titleBarH;
    days.forEach((day, i) => {
        const x = gridLeft + i * (cellW + gap) + cellW / 2;
        ctx.fillStyle = '#555555';
        ctx.font = `600 13px ${font}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(day, x, headerY + headerH / 2);
    });
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(margin + 6, headerY + headerH - 1);
    ctx.lineTo(canvasW - margin - 6, headerY + headerH - 1);
    ctx.stroke();

    // セル描画
    for (let p = 0; p < periodCount; p++) {
        const y = gridTop + p * (cellH + gap);

        // 時限ラベル（番号 + 時間）
        const periodCenterX = margin + periodColW / 2;
        ctx.fillStyle = '#666666';
        ctx.font = `600 12px ${font}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(p + 1), periodCenterX, y + cellH / 2 - 10);
        // 時間表示
        const timeStr = periodTimes[p] || '';
        if (timeStr) {
            const [startTime, endTime] = timeStr.split('~');
            ctx.fillStyle = '#aaaaaa';
            ctx.font = `${canvasW < 500 ? 7 : 8}px ${font}`;
            if (startTime) ctx.fillText(startTime.trim(), periodCenterX, y + cellH / 2 + 2);
            if (endTime) ctx.fillText(endTime.trim(), periodCenterX, y + cellH / 2 + 12);
        }

        for (let d = 0; d < days.length; d++) {
            const x = gridLeft + d * (cellW + gap);
            const coursesInCell = timetable[p][d];

            // 全セル共通: 枠線
            canvasRoundRect(ctx, x, y, cellW, cellH, 7);
            ctx.strokeStyle = '#dcdcdc';
            ctx.lineWidth = 1;
            ctx.stroke();

            if (coursesInCell.length > 0) {
                const course = coursesInCell[0];
                const color = colorMap[course.title] || '#ffffff';
                const c = color === '#ffffff' ? '#aaaaaa' : color;
                const pad = 6;
                const maxW = cellW - pad * 2 - 2;

                // セル背景（角丸 + 薄い色）
                canvasRoundRect(ctx, x, y, cellW, cellH, 7);
                ctx.fillStyle = hexToRgba(c, 0.13);
                ctx.fill();

                // 左ボーダー（角丸に沿う）
                ctx.save();
                ctx.beginPath();
                ctx.moveTo(x + 7, y);
                ctx.lineTo(x, y);
                ctx.quadraticCurveTo(x, y, x, y + 7);
                ctx.lineTo(x, y + cellH - 7);
                ctx.quadraticCurveTo(x, y + cellH, x + 7, y + cellH);
                ctx.lineTo(x + 4, y + cellH);
                ctx.lineTo(x + 4, y);
                ctx.closePath();
                ctx.fillStyle = c;
                ctx.fill();
                ctx.restore();

                let curY = y + pad;
                const textX = x + pad + 3;

                // 教科名（折り返し）
                ctx.fillStyle = darkenHex(c, 0.35);
                ctx.font = `bold ${titleFontSize}px ${font}`;
                ctx.textAlign = 'left';
                ctx.textBaseline = 'top';
                const title = course.title.split('(')[0].trim();
                const tLines = drawWrappedText(ctx, title, textX, curY, maxW, titleLH, titleMaxLines);
                curY += tLines * titleLH + 3;

                // 教室名（折り返しOK）
                const room = classroomMap[course.title] || course.room || '';
                if (room) {
                    ctx.fillStyle = '#555555';
                    ctx.font = `${subFontSize}px ${font}`;
                    const rLines = drawWrappedText(ctx, room, textX, curY, maxW, subLH, roomMaxLines);
                    curY += rLines * subLH + 1;
                }

                // 担当教員
                if (course.instructor) {
                    ctx.fillStyle = '#888888';
                    ctx.font = `${subFontSize}px ${font}`;
                    drawWrappedText(ctx, course.instructor, textX, curY, maxW, subLH, 1);
                }
            } else {
                // 空セル背景
                canvasRoundRect(ctx, x, y, cellW, cellH, 7);
                ctx.fillStyle = '#f9f9f9';
                ctx.fill();
            }
        }
    }

    return canvas;
}

/**
 * Canvas を PNG としてダウンロードする
 */
function downloadCanvasAsPng(canvas: HTMLCanvasElement, filename: string): void {
    canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 'image/png');
}

// 時限の時間設定
const DEFAULT_PERIOD_TIMES = [
    '08:45~10:15',
    '10:30~12:00',
    '13:00~14:30',
    '14:45~16:15',
    '16:30~18:00',
    '18:15~19:45',
];
const PeriodTimesStorageKey = 'cs-timetable-period-times';

async function loadPeriodTimes(hostname: string): Promise<string[]> {
    const result = await fromStorage<string[] | undefined>(hostname, PeriodTimesStorageKey, d => d);
    return result || [...DEFAULT_PERIOD_TIMES];
}

async function savePeriodTimes(hostname: string, times: string[]): Promise<void> {
    await toStorage(hostname, PeriodTimesStorageKey, times);
}

// 教科の色情報のストレージキー
const CourseColorStorageKey = 'cs-timetable-course-colors';

// 教科の色情報の保存・取得
async function loadCourseColors(hostname: string): Promise<Record<string, string>> {
    const result = await fromStorage<Record<string, string> | undefined>(hostname, CourseColorStorageKey, d => d || {});
    return result || {};
}

async function saveCourseColors(hostname: string, colorMap: Record<string, string>): Promise<void> {
    // 既存の色マップとマージして保存（他学期の色を消さない）
    const existing = await loadCourseColors(hostname);
    const merged = { ...existing, ...colorMap };
    await toStorage(hostname, CourseColorStorageKey, merged);
}

// 教科の色選択モーダル
function showCourseColorModal() {
    const hostname = window.location.hostname;
    const modal = document.createElement('div');
    modal.className = 'cs-tact-modal cs-timetable-color-modal'; // クラス名を変更
    modal.style.zIndex = '10002';
    modal.style.maxHeight = '60vh'; // 高さを明示的に60vhに限定
    modal.style.overflowY = 'auto';
    
    const header = document.createElement('div');
    header.className = 'cs-tact-modal-header';
    
    const title = document.createElement('h2');
    title.textContent = '教科の色設定';
    header.appendChild(title);
    
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.className = 'cs-tact-modal-close';
    closeBtn.onclick = () => {
        // 色設定を保存してから閉じる
        const currentColorMap: Record<string, string> = {};
        content.querySelectorAll('div[data-title]').forEach(row => {
            const rowTitle = (row as HTMLElement).dataset.title;
            const colorInput = row.querySelector('input[type="color"]') as HTMLInputElement;
            if (rowTitle && colorInput) {
                currentColorMap[rowTitle] = colorInput.value;
            }
        });
        saveCourseColors(hostname, currentColorMap).then(() => {
            updateTimetable();
        });
        modal.remove();
    };
    header.appendChild(closeBtn);
    modal.appendChild(header);

    const content = document.createElement('div');
    content.className = 'cs-tact-modal-content';
    content.style.maxHeight = '60vh';
    content.style.overflowY = 'auto';
    
    // 現在表示されている講義を取得
    const yearSelect = document.getElementById('cs-timetable-year') as HTMLSelectElement | null;
    const termSelect = document.getElementById('cs-timetable-term') as HTMLSelectElement | null;
    if (!yearSelect || !termSelect) return;
    const year = yearSelect.value;
    const term = termSelect.value;

    const courses = (showAllCourses ? cachedAllCourses : cachedCourses) || [];
    const filteredCourses = filterCoursesByYearAndTerm(courses, year, term);

    // 重複する講義名を除去
    const uniqueCourses = filteredCourses.filter((course, index, self) =>
        index === self.findIndex(c => c.title === course.title)
    );
    
    loadCourseColors(hostname).then((colorMap) => {
        // ヘッダー説明
        const description = document.createElement('div');
        description.style.marginBottom = '16px';
        description.style.padding = '12px';
        description.style.backgroundColor = '#f8f9fa';
        description.style.borderRadius = '4px';
        description.style.fontSize = '14px';
        description.style.color = '#666';
        description.innerHTML = `
            <p><strong>教科の色設定</strong></p>
            <p>各教科の色を選択してください。デフォルトは白です。</p>
        `;
        content.appendChild(description);
        
        uniqueCourses.forEach(course => {
            const card = document.createElement('div');
            card.style.marginBottom = '12px';
            card.style.padding = '10px 12px';
            card.style.border = '1px solid #e0e0e0';
            card.style.borderRadius = '4px';
            card.style.backgroundColor = '#fff';

            // 上段: 講義名 + カラーピッカー + プレビュー + リセット
            const topRow = document.createElement('div');
            topRow.style.display = 'flex';
            topRow.style.alignItems = 'center';
            topRow.style.gap = '10px';

            const label = document.createElement('span');
            const shortTitle = course.title.split('(')[0].trim();
            label.textContent = shortTitle;
            label.style.flex = '1';
            label.style.fontWeight = 'bold';
            label.style.fontSize = '14px';
            label.style.overflow = 'hidden';
            label.style.textOverflow = 'ellipsis';
            label.style.whiteSpace = 'nowrap';
            label.title = course.title;
            topRow.appendChild(label);

            const colorInput = document.createElement('input');
            colorInput.type = 'color';
            colorInput.value = colorMap[course.title] || '#ffffff';
            colorInput.style.width = '40px';
            colorInput.style.height = '30px';
            colorInput.style.border = '1px solid #ccc';
            colorInput.style.borderRadius = '4px';
            colorInput.style.cursor = 'pointer';
            colorInput.style.flexShrink = '0';
            topRow.appendChild(colorInput);

            const colorPreview = document.createElement('div');
            colorPreview.style.width = '80px';
            colorPreview.style.height = '30px';
            colorPreview.style.backgroundColor = colorInput.value;
            colorPreview.style.border = '1px solid #ccc';
            colorPreview.style.borderRadius = '4px';
            colorPreview.style.display = 'flex';
            colorPreview.style.alignItems = 'center';
            colorPreview.style.justifyContent = 'center';
            colorPreview.style.fontSize = '11px';
            colorPreview.style.flexShrink = '0';
            colorPreview.style.color = colorInput.value === '#ffffff' ? '#333' : '#fff';
            colorPreview.textContent = 'プレビュー';
            topRow.appendChild(colorPreview);

            const resetBtn = document.createElement('button');
            resetBtn.textContent = 'リセット';
            resetBtn.className = 'cs-btn cs-btn-secondary';
            resetBtn.style.fontSize = '11px';
            resetBtn.style.padding = '4px 8px';
            resetBtn.style.whiteSpace = 'nowrap';
            resetBtn.style.flexShrink = '0';
            resetBtn.onclick = () => {
                colorInput.value = '#ffffff';
                colorPreview.style.backgroundColor = '#ffffff';
                colorPreview.style.color = '#333';
            };
            topRow.appendChild(resetBtn);
            card.appendChild(topRow);

            // 色変更時のプレビュー更新
            colorInput.addEventListener('input', () => {
                colorPreview.style.backgroundColor = colorInput.value;
                colorPreview.style.color = colorInput.value === '#ffffff' ? '#333' : '#fff';
            });

            // 下段: プリセットカラーパレット
            const PRESET_COLORS = [
                '#FFB3BA', '#FFDFBA', '#FFFFBA', '#BAFFC9', '#BAE1FF',
                '#E8BAFF', '#FFD6E0', '#D4F0F0', '#FCE4EC', '#F3E5F5',
            ];
            const presetRow = document.createElement('div');
            presetRow.style.display = 'flex';
            presetRow.style.gap = '5px';
            presetRow.style.marginTop = '8px';
            presetRow.style.flexWrap = 'wrap';
            PRESET_COLORS.forEach(preset => {
                const swatch = document.createElement('button');
                swatch.style.width = '22px';
                swatch.style.height = '22px';
                swatch.style.backgroundColor = preset;
                swatch.style.border = '1px solid #ccc';
                swatch.style.borderRadius = '3px';
                swatch.style.cursor = 'pointer';
                swatch.style.padding = '0';
                swatch.style.flexShrink = '0';
                swatch.title = preset;
                swatch.onclick = () => {
                    colorInput.value = preset;
                    colorPreview.style.backgroundColor = preset;
                    colorPreview.style.color = '#333';
                };
                presetRow.appendChild(swatch);
            });
            card.appendChild(presetRow);

            card.dataset.title = course.title;
            content.appendChild(card);
        });
        
        // 全てリセットボタン
        const resetContainer = document.createElement('div');
        resetContainer.style.marginTop = '16px';
        resetContainer.style.textAlign = 'center';
        const resetAllBtn = document.createElement('button');
        resetAllBtn.textContent = '全てリセット';
        resetAllBtn.className = 'cs-btn cs-btn-secondary';
        resetAllBtn.onclick = () => {
            content.querySelectorAll('div[data-title]').forEach(card => {
                const colorInput = card.querySelector('input[type="color"]') as HTMLInputElement;
                // topRow内の3番目の子要素がcolorPreview
                const topRow = card.firstElementChild;
                const colorPreview = topRow?.children[2] as HTMLElement | undefined;
                if (colorInput) {
                    colorInput.value = '#ffffff';
                }
                if (colorPreview) {
                    colorPreview.style.backgroundColor = '#ffffff';
                    colorPreview.style.color = '#333';
                }
            });
        };
        resetContainer.appendChild(resetAllBtn);
        content.appendChild(resetContainer);

        // 時限の時間設定セクション
        const periodSection = document.createElement('div');
        periodSection.style.marginTop = '20px';
        periodSection.style.padding = '12px';
        periodSection.style.backgroundColor = '#f8f9fa';
        periodSection.style.borderRadius = '6px';

        const periodLabel = document.createElement('p');
        periodLabel.style.fontSize = '14px';
        periodLabel.style.fontWeight = 'bold';
        periodLabel.style.marginBottom = '10px';
        periodLabel.style.color = '#333';
        periodLabel.textContent = '時限の時間設定';
        periodSection.appendChild(periodLabel);

        const periodInputs: HTMLInputElement[] = [];
        loadPeriodTimes(hostname).then(savedTimes => {
            for (let i = 0; i < 6; i++) {
                const pRow = document.createElement('div');
                pRow.style.display = 'flex';
                pRow.style.alignItems = 'center';
                pRow.style.gap = '8px';
                pRow.style.marginBottom = '6px';

                const pLabel = document.createElement('span');
                pLabel.textContent = `${i + 1}限`;
                pLabel.style.width = '32px';
                pLabel.style.fontSize = '13px';
                pLabel.style.fontWeight = 'bold';
                pLabel.style.color = '#555';
                pRow.appendChild(pLabel);

                const pInput = document.createElement('input');
                pInput.type = 'text';
                pInput.value = savedTimes[i] || DEFAULT_PERIOD_TIMES[i] || '';
                pInput.placeholder = '08:45~10:15';
                pInput.style.flex = '1';
                pInput.style.padding = '4px 8px';
                pInput.style.fontSize = '13px';
                pInput.style.border = '1px solid #ccc';
                pInput.style.borderRadius = '4px';
                periodInputs.push(pInput);
                pRow.appendChild(pInput);

                periodSection.appendChild(pRow);
            }
        });
        content.appendChild(periodSection);

        // アスペクト比選択セクション
        const aspectSection = document.createElement('div');
        aspectSection.style.marginTop = '20px';
        aspectSection.style.padding = '12px';
        aspectSection.style.backgroundColor = '#f8f9fa';
        aspectSection.style.borderRadius = '6px';

        const aspectLabel = document.createElement('p');
        aspectLabel.style.fontSize = '14px';
        aspectLabel.style.fontWeight = 'bold';
        aspectLabel.style.marginBottom = '10px';
        aspectLabel.style.color = '#333';
        aspectLabel.textContent = '出力サイズ';
        aspectSection.appendChild(aspectLabel);

        const aspectBtnContainer = document.createElement('div');
        aspectBtnContainer.style.display = 'flex';
        aspectBtnContainer.style.gap = '8px';
        aspectBtnContainer.style.justifyContent = 'center';
        aspectBtnContainer.style.flexWrap = 'wrap';

        let selectedAspect = '9:16';
        const aspectKeys = Object.keys(ASPECT_PRESETS);
        const aspectButtons: HTMLButtonElement[] = [];

        aspectKeys.forEach(key => {
            const btn = document.createElement('button');
            btn.textContent = ASPECT_PRESETS[key].label;
            btn.className = key === selectedAspect ? 'cs-btn cs-btn-primary' : 'cs-btn cs-btn-secondary';
            btn.style.fontSize = '12px';
            btn.style.padding = '6px 12px';
            btn.onclick = () => {
                selectedAspect = key;
                aspectButtons.forEach((b, i) => {
                    b.className = aspectKeys[i] === key ? 'cs-btn cs-btn-primary' : 'cs-btn cs-btn-secondary';
                });
            };
            aspectButtons.push(btn);
            aspectBtnContainer.appendChild(btn);
        });

        aspectSection.appendChild(aspectBtnContainer);
        content.appendChild(aspectSection);

        // Canvas生成の共通ロジック
        async function buildExportCanvas(): Promise<{ canvas: HTMLCanvasElement; filename: string } | null> {
            const currentColorMap: Record<string, string> = {};
            content.querySelectorAll('div[data-title]').forEach(row => {
                const rowTitle = (row as HTMLElement).dataset.title;
                const colorInput = row.querySelector('input[type="color"]') as HTMLInputElement;
                if (rowTitle && colorInput) {
                    currentColorMap[rowTitle] = colorInput.value;
                }
            });
            await saveCourseColors(hostname, currentColorMap);

            const yearSelect = document.getElementById('cs-timetable-year') as HTMLSelectElement;
            const termSelect = document.getElementById('cs-timetable-term') as HTMLSelectElement;
            const selectedYear = yearSelect.value;
            const selectedTerm = termSelect.value;
            const selectedTermLabel = termSelect.options[termSelect.selectedIndex].textContent || selectedTerm;
            const allCourses = (showAllCourses ? cachedAllCourses : cachedCourses) || [];
            const filteredCourses = filterCoursesByYearAndTerm(allCourses, selectedYear, selectedTerm);
            const classroomData = await loadClassroomInfo(hostname);

            const exportDays = ['月', '火', '水', '木', '金'];
            const exportPeriodCount = 6;
            const exportTimetable: CourseInfo[][][] = Array.from(
                {length: exportPeriodCount},
                () => Array.from({length: exportDays.length}, () => [] as CourseInfo[])
            );
            filteredCourses.forEach(c => {
                c.dayPeriod.forEach(dp => {
                    const dayIdx = exportDays.findIndex(d => dp.startsWith(d));
                    const prd = parseInt(dp.replace(/[^0-9]/g, ''));
                    if (dayIdx >= 0 && prd >= 1 && prd <= exportPeriodCount) {
                        exportTimetable[prd - 1][dayIdx].push(c);
                    }
                });
            });

            const currentPeriodTimes = periodInputs.map(input => input.value.trim());
            await savePeriodTimes(hostname, currentPeriodTimes);

            const canvas = renderTimetableToCanvas(
                exportTimetable, exportDays, exportPeriodCount,
                currentColorMap, classroomData, selectedYear, selectedTermLabel,
                selectedAspect, currentPeriodTimes
            );
            if (!canvas) return null;
            return { canvas, filename: `時間割_${selectedYear}_${selectedTermLabel}.png` };
        }

        // プレビュー表示エリア
        const previewContainer = document.createElement('div');
        previewContainer.style.marginTop = '16px';
        previewContainer.style.textAlign = 'center';
        content.appendChild(previewContainer);

        // ボタンエリア
        const btnContainer = document.createElement('div');
        btnContainer.style.marginTop = '12px';
        btnContainer.style.display = 'flex';
        btnContainer.style.justifyContent = 'center';
        btnContainer.style.gap = '12px';

        // プレビューボタン
        const previewBtn = document.createElement('button');
        previewBtn.textContent = 'プレビュー';
        previewBtn.className = 'cs-btn cs-btn-secondary';
        previewBtn.style.padding = '10px 24px';
        previewBtn.style.fontSize = '15px';
        previewBtn.onclick = async () => {
            previewBtn.textContent = '生成中...';
            previewBtn.disabled = true;
            const result = await buildExportCanvas();
            previewBtn.textContent = 'プレビュー';
            previewBtn.disabled = false;
            if (!result) return;

            // 既存のプレビューをクリア
            while (previewContainer.firstChild) {
                previewContainer.removeChild(previewContainer.firstChild);
            }
            const img = document.createElement('img');
            img.src = result.canvas.toDataURL('image/png');
            img.style.maxWidth = '100%';
            img.style.border = '1px solid #ddd';
            img.style.borderRadius = '8px';
            img.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
            previewContainer.appendChild(img);

            // ダウンロードボタンを表示
            downloadBtn.style.display = '';
            downloadBtn.onclick = () => {
                downloadCanvasAsPng(result.canvas, result.filename);
            };
        };
        btnContainer.appendChild(previewBtn);

        // ダウンロードボタン（初期非表示）
        const downloadBtn = document.createElement('button');
        downloadBtn.textContent = 'PNG をダウンロード';
        downloadBtn.className = 'cs-btn cs-btn-primary';
        downloadBtn.style.padding = '10px 24px';
        downloadBtn.style.fontSize = '15px';
        downloadBtn.style.display = 'none';
        btnContainer.appendChild(downloadBtn);

        content.appendChild(btnContainer);
    });
    
    modal.appendChild(content);
    document.body.appendChild(modal);
}

/**
 * 時間割を更新する
 */
async function updateTimetable() {
    const timetableDiv = document.getElementById('cs-timetable');
    const yearSelect = document.getElementById('cs-timetable-year') as HTMLSelectElement;
    const termSelect = document.getElementById('cs-timetable-term') as HTMLSelectElement;
    if (!timetableDiv || !yearSelect || !termSelect) return;
    const year = yearSelect.value;
    const term = termSelect.value;
    const currentSiteHostname = window.location.hostname;
    saveTimetableSettings(currentSiteHostname, year, term);
    
    // ロード表示を削除してクリア
    timetableDiv.innerHTML = '';
    
    // 更新中表示を追加
    const updatingDiv = document.createElement('div');
    updatingDiv.className = 'cs-timetable-updating';
    updatingDiv.style.textAlign = 'center';
    updatingDiv.style.padding = '20px';
    updatingDiv.style.color = '#666';
    updatingDiv.innerHTML = '<p>時間割を更新中...</p>';
    timetableDiv.appendChild(updatingDiv);
    
    // 時間割更新時にも色設定を再適用
    const modal = document.querySelector('.cs-timetable-modal') as HTMLElement;
    if (modal) {
        try {
            const settings = await getStoredSettings(currentSiteHostname);
            for (const colorName of Object.getOwnPropertyNames(settings.color)) {
                // @ts-ignore
                const color = settings.color[colorName];
                modal.style.setProperty(`--${colorName}`, color);
            }
            modal.style.setProperty("--textColor", settings.getTextColor());
            modal.style.setProperty("--bgColor", settings.getBgColor());
            modal.style.setProperty("--dateColor", settings.getDateColor());
        } catch (error) {
            logger.error('時間割更新時の色設定適用に失敗しました:', error);
        }
    }
    
    const days = ['', '月', '火', '水', '木', '金'];
    const periods = 6;
    let courses: CourseInfo[] = [];

    if (showAllCourses) {
        // 全コース表示モード: fav-sites-entryから全コースを取得
        if (cachedAllCourses && cachedAllCourses.length > 0) {
            logger.debug('キャッシュされた全講義情報を使用します', cachedAllCourses.length);
            courses = cachedAllCourses;
        } else {
            try {
                courses = fetchAllCoursesFromAllSites();
                if (courses && courses.length > 0) {
                    cachedAllCourses = courses;
                } else {
                    // 全サイトが取得できない場合はお気に入りにフォールバック
                    logger.warn('全サイトからの取得に失敗、お気に入りにフォールバック');
                    courses = fetchCoursesFromPortal();
                    if (!courses || courses.length === 0) {
                        courses = extractCoursesFromPage();
                    }
                    if (courses && courses.length > 0) {
                        cachedCourses = courses;
                    } else {
                        courses = [];
                    }
                }
            } catch (error) {
                logger.error('全講義情報取得エラー:', error);
                courses = [];
            }
        }
    } else {
        // お気に入りのみモード: 従来通り
        if (cachedCourses && cachedCourses.length > 0) {
            logger.debug('キャッシュされた講義情報を使用します', cachedCourses.length);
            courses = cachedCourses;
        } else {
            try {
                courses = fetchCoursesFromPortal();
                logger.debug('fetchCoursesFromPortal結果:', courses);
                if (!courses || courses.length === 0) {
                    courses = extractCoursesFromPage();
                    logger.debug('extractCoursesFromPage結果:', courses);
                }
                if (courses && courses.length > 0) {
                    cachedCourses = courses;
                } else {
                    courses = [];
                }
            } catch (error) {
                logger.error('講義情報取得エラー:', error);
                courses = [];
            }
        }
    }
    logger.debug(`選択された年度: ${year}, 学期: ${term}`);

    // 教員情報が未取得のコースがあればAPIから補完
    const needsInstructor = courses.some(c => !c.instructor);
    if (needsInstructor && courses.length > 0) {
        try {
            await enrichCoursesWithInstructor(courses);
        } catch (error) {
            logger.warn('教員情報の取得に失敗:', error);
        }
    }

    const filteredCourses = filterCoursesByYearAndTerm(courses, year, term);
    // 教室情報を一度だけ取得
    loadClassroomInfo(currentSiteHostname).then(classroomMap => {
        const table = document.createElement('table');
        table.className = 'cs-timetable-table';
        table.style.tableLayout = 'fixed';
        table.style.width = '100%';
        table.style.borderCollapse = 'collapse';
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        days.forEach(day => {
            const th = document.createElement('th');
            th.textContent = day;
            th.style.padding = '8px';
            th.style.backgroundColor = '#f5f5f5';
            th.style.border = '1px solid #ddd';
            th.style.textAlign = 'center';
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);
        const tbody = document.createElement('tbody');
        for (let period = 1; period <= periods; period++) {
            const row = document.createElement('tr');
            const periodCell = document.createElement('td');
            periodCell.className = 'cs-timetable-period';
            periodCell.textContent = `${period}限`;
            periodCell.style.backgroundColor = '#f5f5f5';
            periodCell.style.fontWeight = 'bold';
            periodCell.style.textAlign = 'center';
            periodCell.style.verticalAlign = 'middle';
            periodCell.style.width = '50px';
            periodCell.style.border = '1px solid #ddd';
            row.appendChild(periodCell);
            for (let dayIndex = 1; dayIndex < days.length; dayIndex++) {
                const day = days[dayIndex];
                const cell = document.createElement('td');
                cell.className = 'cs-timetable-cell';
                cell.style.width = '20%';
                cell.style.maxWidth = '20%';
                cell.style.padding = '5px';
                cell.style.verticalAlign = 'top';
                cell.style.border = '1px solid #ddd';
                cell.style.cursor = 'pointer';
                cell.style.transition = 'all 0.3s ease';
                const coursesForCell = filteredCourses.filter(course => {
                    return course.dayPeriod.some(dp => dp === day + period);
                });
                if (coursesForCell.length > 0) {
                    const courseCategoryMap = extractCourseCategories();
                    const courseUrl = coursesForCell[0].url;
                    const firstCourse = coursesForCell[0];
                    const shortTitle = firstCourse.title.split('(')[0].trim();
                    const category = courseCategoryMap.get(shortTitle);
                    if (category && category !== 'passed') {
                        if (category === 'due24h') {
                            cell.dataset.category = 'due24h';
                        } else if (category === 'due5d') {
                            cell.dataset.category = 'due5d';
                        } else if (category === 'due14d') {
                            cell.dataset.category = 'due14d';
                        } else if (category === 'dueOver14d') {
                            cell.dataset.category = 'dueOver14d';
                        }
                    }
                    cell.addEventListener('click', () => {
                        window.location.href = courseUrl;
                    });
                    coursesForCell.forEach(course => {
                        const courseDiv = document.createElement('div');
                        courseDiv.className = 'cs-timetable-course';
                        courseDiv.style.margin = '0 0 10px 0';
                        courseDiv.style.padding = '4px 2px';
                        courseDiv.style.minHeight = '40px';
                        courseDiv.style.display = 'flex';
                        courseDiv.style.flexDirection = 'column';
                        courseDiv.style.border = '1px solid rgba(0, 0, 0, 0.05)';
                        courseDiv.style.borderRadius = '4px';
                        courseDiv.style.backgroundColor = 'rgba(255, 255, 255, 0.6)';
                        let displayTitle = course.title;
                        if (displayTitle.includes('(')) {
                            displayTitle = displayTitle.split('(')[0].trim();
                        }
                        if (displayTitle.length > 15) {
                            displayTitle = displayTitle.substring(0, 12) + '...';
                        }
                        // 教科名部分 - 明確に分離されたコンテナ
                        const courseTitleContainer = document.createElement('div');
                        courseTitleContainer.className = 'cs-timetable-title-container';
                        courseTitleContainer.style.marginBottom = '6px';
                        courseTitleContainer.style.paddingBottom = '4px';
                        courseTitleContainer.style.borderBottom = '1px solid #e0e0e0';
                        
                        const courseTitleEl = document.createElement('div');
                        courseTitleEl.textContent = displayTitle;
                        courseTitleEl.className = 'cs-timetable-title';
                        courseTitleEl.title = course.title;
                        courseTitleEl.style.display = 'block';
                        courseTitleEl.style.overflow = 'hidden';
                        courseTitleEl.style.textOverflow = 'ellipsis';
                        courseTitleEl.style.whiteSpace = 'nowrap';
                        courseTitleEl.style.fontSize = '12px';
                        courseTitleEl.style.color = '#265b81';
                        courseTitleEl.style.fontWeight = 'bold';
                        courseTitleEl.style.textAlign = 'center';
                        courseTitleContainer.appendChild(courseTitleEl);
                        courseDiv.appendChild(courseTitleContainer);
                        
                        // 教室名部分 - 明確に分離
                        const classroom = classroomMap[course.title] || course.room;
                        if (classroom) {
                            const roomContainer = document.createElement('div');
                            roomContainer.className = 'cs-timetable-room-container';
                            roomContainer.style.marginTop = '4px';
                            
                            const roomLabel = document.createElement('div');
                            roomLabel.className = 'cs-timetable-room-label';
                            roomLabel.textContent = '教室:';
                            roomLabel.style.fontSize = '9px';
                            roomLabel.style.color = '#888';
                            roomLabel.style.marginBottom = '2px';
                            roomContainer.appendChild(roomLabel);
                            
                            const roomDiv = document.createElement('div');
                            roomDiv.className = 'cs-timetable-room';
                            roomDiv.textContent = classroom;
                            roomDiv.style.fontSize = '11px';
                            roomDiv.style.color = '#444';
                            roomDiv.style.fontWeight = 'normal';
                            roomDiv.style.backgroundColor = '#f5f5f5';
                            roomDiv.style.padding = '2px 4px';
                            roomDiv.style.borderRadius = '3px';
                            roomDiv.style.border = '1px solid #e9ecef';
                            roomDiv.style.display = 'inline-block';
                            roomContainer.appendChild(roomDiv);
                            courseDiv.appendChild(roomContainer);
                        }
                        if (course.instructor) {
                            const instructorContainer = document.createElement('div');
                            instructorContainer.className = 'cs-timetable-instructor-container';
                            instructorContainer.style.marginTop = '4px';
                            
                            const instructorLabel = document.createElement('div');
                            instructorLabel.className = 'cs-timetable-instructor-label';
                            instructorLabel.textContent = '担当:';
                            instructorLabel.style.fontSize = '9px';
                            instructorLabel.style.color = '#888';
                            instructorLabel.style.marginBottom = '2px';
                            instructorContainer.appendChild(instructorLabel);
                            
                            const instructorDiv = document.createElement('div');
                            instructorDiv.className = 'cs-timetable-instructor';
                            instructorDiv.textContent = course.instructor;
                            instructorDiv.style.fontSize = '10px';
                            instructorDiv.style.color = '#444';
                            instructorDiv.style.fontStyle = 'italic';
                            instructorDiv.style.backgroundColor = '#f8f9fa';
                            instructorDiv.style.padding = '2px 4px';
                            instructorDiv.style.borderRadius = '3px';
                            instructorDiv.style.border = '1px solid #e9ecef';
                            instructorDiv.style.display = 'inline-block';
                            instructorContainer.appendChild(instructorDiv);
                            courseDiv.appendChild(instructorContainer);
                        }
                        cell.appendChild(courseDiv);
                        logger.debug(`セル配置: ${day}${period} - ${course.title}`);
                    });
                }
                row.appendChild(cell);
            }
            tbody.appendChild(row);
        }
        table.appendChild(tbody);
        
        // 更新中表示を削除してテーブルを追加
        timetableDiv.innerHTML = '';
        timetableDiv.appendChild(table);
        
        const modalTitle = document.querySelector('.cs-timetable-modal .cs-tact-modal-header h2');
        if (modalTitle) {
            modalTitle.textContent = `時間割表示 (${year}年 ${termSelect.options[termSelect.selectedIndex].textContent})`;
        }
    });
}

