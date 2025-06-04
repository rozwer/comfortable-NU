/**
 * TACT時間割管理機能
 * 時間割の取得・表示・管理を行う統合モジュール
 */
/**
 * 時間割表示機能
 * このモジュールはTACTポータルに時間割表示機能を追加します
 */

import { MaxTimestamp, TimetableYearStorage, TimetableTermStorage } from "../../constant";
import { courseColorInfo } from "../../components/favoritesBar";
import { fromStorage, toStorage } from "../storage";
import { getStoredSettings } from "../setting/getSetting";
import { i18nMessage } from '../chrome/index';

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
 * サンプル用の講義データ（デバッグ用）
 */
const SAMPLE_COURSES: CourseInfo[] = [
    // 春学期
    {
        title: '固体電子工学及び演習(2025年度春/月4限,木3限)',
        term: '春',
        academicYear: '2025',
        dayPeriod: ['月4', '木3'],
        url: 'https://tact.ac.thers.ac.jp/portal/site/n_2025_0846221',
        room: '工学部2号館241',
        instructor: '鈴木教授'
    },
    {
        title: 'プログラミング演習(2025年度春/火3限,金2限)',
        term: '春',
        academicYear: '2025',
        dayPeriod: ['火3', '金2'],
        url: 'https://tact.ac.thers.ac.jp/portal/site/example1',
        room: '情報学部実習室301',
        instructor: '佐藤教授'
    },
    {
        title: '微分方程式(2025年度春/水2限)',
        term: '2025年度春',
        dayPeriod: ['水2'],
        url: 'https://tact.ac.thers.ac.jp/portal/site/example2',
        room: '工学部3号館301',
        instructor: '高橋教授'
    },
    
    // 春学期Ⅰ
    {
        title: 'データ構造とアルゴリズム(2025年度春Ⅰ/火2限,金1限)',
        term: '2025年度春Ⅰ',
        dayPeriod: ['火2', '金1'],
        url: 'https://tact.ac.thers.ac.jp/portal/site/example3',
        room: '情報学部講義室201',
        instructor: '伊藤教授'
    },
    {
        title: '物理学概論(2025年度春Ⅰ/月1限,木4限)',
        term: '2025年度春Ⅰ',
        dayPeriod: ['月1', '木4'],
        url: 'https://tact.ac.thers.ac.jp/portal/site/example4',
        room: '理学部講義室103',
        instructor: '田中教授'
    },
    
    // 春学期Ⅱ
    {
        title: 'システム設計(2025年度春Ⅱ/水3限,金3限)',
        term: '2025年度春Ⅱ',
        dayPeriod: ['水3', '金3'],
        url: 'https://tact.ac.thers.ac.jp/portal/site/example5',
        room: '工学部1号館154',
        instructor: '中村教授'
    },
    
    // 秋学期
    {
        title: '量子力学(2025年度秋/月2限,水1限)',
        term: '2025年度秋',
        dayPeriod: ['月2', '水1'],
        url: 'https://tact.ac.thers.ac.jp/portal/site/example6',
        room: '理学部講義室203',
        instructor: '山本教授'
    },
    {
        title: '情報理論(2025年度秋/火1限,木2限)',
        term: '2025年度秋',
        dayPeriod: ['火1', '木2'],
        url: 'https://tact.ac.thers.ac.jp/portal/site/example7',
        room: '情報学部講義室301',
        instructor: '渡辺教授'
    },
    
    // 秋学期Ⅰ
    {
        title: '統計学(2025年度秋Ⅰ/月3限,木1限)',
        term: '2025年度秋Ⅰ',
        dayPeriod: ['月3', '木1'],
        url: 'https://tact.ac.thers.ac.jp/portal/site/example8',
        room: '経済学部201',
        instructor: '山田教授'
    },
    
    // 秋学期Ⅱ
    {
        title: '人工知能概論(2025年度秋Ⅱ/火4限,金4限)',
        term: '2025年度秋Ⅱ',
        dayPeriod: ['火4', '金4'],
        url: 'https://tact.ac.thers.ac.jp/portal/site/example9',
        room: '情報学部講義室401',
        instructor: '斎藤教授'
    },
    
    // 2024年度のサンプルデータも追加
    {
        title: '量子コンピュータ入門(2024年度春/月3限,水2限)',
        term: '2024年度春',
        dayPeriod: ['月3', '水2'],
        url: 'https://tact.ac.thers.ac.jp/portal/site/example10',
        room: '工学部3号館202',
        instructor: '木村教授'
    },
    {
        title: 'ネットワーク工学(2024年度秋/火2限,金3限)',
        term: '2024年度秋',
        dayPeriod: ['火2', '金3'],
        url: 'https://tact.ac.thers.ac.jp/portal/site/example11',
        room: '情報学部講義室202',
        instructor: '林教授'
    }
];

/**
 * キャッシュされた講義情報
 */
let cachedCourses: CourseInfo[] | null = null;

/**
 * 保存された時間割設定を読み込む
 * @param hostname サイトのホスト名
 * @returns 年度と学期の設定情報
 */
async function loadTimetableSettings(hostname: string): Promise<{year: string, term: string}> {
    // LocalStorageから年度と学期の設定を読み込む
    const savedYear = await fromStorage<string | undefined>(hostname, TimetableYearStorage, 
        (data: any) => data === undefined ? undefined : String(data));
    
    const savedTerm = await fromStorage<string | undefined>(hostname, TimetableTermStorage,
        (data: any) => data === undefined ? undefined : String(data));
    
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
            console.warn(`保存された年度 ${savedYear} が古すぎるため、現在の年度 ${currentYearStr} を使用します。`);
        }
    }
    
    console.log(`設定読み込み - 保存年度: ${savedYear}, 保存学期: ${savedTerm}, 最終年度: ${finalYear}`);
    
    return {
        year: finalYear,
        term: savedTerm || 'spring'
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
    console.log(`時間割設定を保存しました - 年度: ${year}, 学期: ${term}`);
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
    const courses = cachedCourses || SAMPLE_COURSES;
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
            row.appendChild(input);
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
            console.log(i18nMessage('color_settings_applied'));
        } catch (error) {
            console.error(i18nMessage('color_settings_apply_failed'), error);
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
        console.log(`読み込まれた設定 - 年度: ${settings.year}, 学期: ${settings.term}`);
        
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
            console.warn(`保存された年度 ${settings.year} がセレクトボックスにありません。現在の年度 ${currentYear} を選択します。`);
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
            console.warn(`保存された学期 ${settings.term} がセレクトボックスにありません。デフォルト学期 'spring' を選択します。`);
            for (let i = 0; i < termSelect.options.length; i++) {
                if (termSelect.options[i].value === 'spring') {
                    termSelect.selectedIndex = i;
                    break;
                }
            }
        }
        
        // セレクトボックス設定完了後に初期表示を実行
        console.log('初期時間割表示を開始します');
        
        // 講義情報の事前取得を試みる
        if (!cachedCourses) {
            try {
                // 通常の取得方法を試す
                let courses = fetchCoursesFromPortal();
                
                // 取得できなかった場合は代替手段を試す
                if (!courses || courses.length === 0) {
                    courses = extractCoursesFromPage();
                }
                
                if (courses && courses.length > 0) {
                    cachedCourses = courses;
                    console.log('講義情報をキャッシュしました:', cachedCourses);
                }
            } catch (error) {
                console.error('講義情報取得エラー:', error);
            }
        }
        
        updateTimetable();
    }).catch(error => {
        console.error('設定読み込みエラー:', error);
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
    
    // 教室編集ボタン追加
    const classroomEditBtn = document.createElement('button');
    classroomEditBtn.textContent = '教室編集';
    classroomEditBtn.className = 'cs-btn cs-btn-secondary';
    classroomEditBtn.style.marginLeft = '12px';
    classroomEditBtn.onclick = showClassroomEditModal;
    selectors.appendChild(classroomEditBtn);
    
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
        console.log(`年度選択変更: ${yearSelect.value}`);
    });
    
    termSelect.addEventListener('change', () => {
        console.log(`学期選択変更: ${termSelect.value}`);
    });
};

/**
 * TACTポータルから実際の講義情報を取得
 * @returns 講義情報の配列
 */
function fetchCoursesFromPortal(): CourseInfo[] {
    const courses: CourseInfo[] = [];
    
    // デバッグメッセージ
    console.log('時間割情報を取得中...');
    
    // より具体的なセレクタを使用（クラス名を複数指定）
    const courseLinks = document.querySelectorAll('a.link-container[title]');
    console.log('取得した講義リンク数:', courseLinks.length);
    
    if (courseLinks.length === 0) {
        // 別のセレクタも試してみる
        const altCourseLinks = document.querySelectorAll('.link-container');
        console.log('代替セレクタで取得した講義リンク数:', altCourseLinks.length);
        
        // デバッグ用に最初の数個の要素を表示
        for (let i = 0; i < Math.min(5, altCourseLinks.length); i++) {
            const el = altCourseLinks[i];
            console.log(`リンク${i}:`, el.tagName, el.className, el.textContent?.slice(0, 30));
        }
    }
    
    // DOM全体をデバッグ出力（講義情報を含む可能性のある部分）
    const mainContent = document.querySelector('#content') || document.body;
    console.log('メインコンテンツ内のHTMLサンプル:', 
               mainContent.innerHTML.slice(0, 500) + '...');
    
    courseLinks.forEach((link, index) => {
        const courseLink = link as HTMLAnchorElement;
        let courseTitle = '';
        
        // span内のテキストまたはtitle属性から情報を取得
        const spanText = courseLink.querySelector('span')?.textContent?.trim();
        const titleAttr = courseLink.getAttribute('title');
        
        courseTitle = spanText || titleAttr || '';
        
        console.log(`講義${index}: ${courseTitle}`);
        
        if (courseTitle && courseLink.href) {
            // タイトルから情報を抽出 例: "固体電子工学及び演習(2025年度春/月４限,木３限)"
            // 複数のパターンに対応できるよう、より柔軟な正規表現を使用
            const titleMatch = courseTitle.match(/(.+)\((\d{4})年度(.+)[\\/](.+)\)/);
            
            if (titleMatch) {
                const title = titleMatch[1].trim();
                const year = titleMatch[2];
                const term = titleMatch[3].trim();
                const periodInfo = titleMatch[4].trim();
                
                console.log(`解析 - 講義名: ${title}, 年度: ${year}, 学期: ${term}, 時限: ${periodInfo}`);
                
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
                
                console.log('変換後の曜日時限:', dayPeriods);
                
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
                console.log(`講義情報の正規表現マッチに失敗: ${courseTitle}`);
            }
        }
    });
    
    console.log('取得した講義情報', courses);
    return courses;
}

/**
 * ページ内の要素から講義情報を抽出する
 */
function extractCoursesFromPage(): CourseInfo[] {
    const extractedCourses: CourseInfo[] = [];
    console.log('ページから講義情報を抽出中...');
    
    try {
        // 方法1: titleを含むリンク要素を検索
        const linkElements = document.querySelectorAll('a[title*="限"]');
        console.log('見つかったリンク数:', linkElements.length);
        
        if (linkElements.length > 0) {
            linkElements.forEach((link, index) => {
                const anchorEl = link as HTMLAnchorElement;
                const title = anchorEl.title;
                const href = anchorEl.href;
                const span = anchorEl.querySelector('span');
                const text = span ? span.textContent : anchorEl.textContent;
                
                console.log(`リンク${index}:`, title, href, text);
                
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
                            console.log(`抽出成功 - タイトル: ${courseTitle}, 年度: ${year}, 学期: ${courseTerm}`); 
                            
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
                        console.error('抽出エラー:', e);
                    }
                }
            });
        }
        
        // 方法2: クラス名から検索
        if (extractedCourses.length === 0) {
            const classElements = document.querySelectorAll('.link-container');
            console.log('クラス名から見つかった要素数:', classElements.length);
            
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
                        
                        console.log(`クラス名から抽出 - タイトル: ${courseTitle}, 年度: ${year}, 学期: ${term}`);
                        
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
        
        // 方法3: ハードコードされたサンプルデータ
        if (extractedCourses.length === 0) {
            console.log('実際のデータが見つからないため、サンプルデータを使用します');
            return SAMPLE_COURSES;
        }
    } catch (e) {
        console.error('講義情報抽出エラー:', e);
        return SAMPLE_COURSES;
    }
    
    console.log('抽出した講義情報:', extractedCourses);
    return extractedCourses;
}

/**
 * 学期の表記を標準化
 */
export function normalizeTerm(term: string): string {
    // 空白とカタカナ、ひらがなの違いを無視して比較するため小文字に変換
    const normalizedTerm = term.toLowerCase();
    
    if (normalizedTerm.includes('春') || normalizedTerm.includes('前期') || normalizedTerm.includes('spring')) {
        if (normalizedTerm.includes('i') || normalizedTerm.includes('ⅰ') || normalizedTerm.includes('１') || 
            normalizedTerm.includes('1') || normalizedTerm.includes('一')) 
            return 'spring-1';
        if (normalizedTerm.includes('ii') || normalizedTerm.includes('ⅱ') || normalizedTerm.includes('２') || 
            normalizedTerm.includes('2') || normalizedTerm.includes('二')) 
            return 'spring-2';
        return 'spring';
    }
    if (normalizedTerm.includes('秋') || normalizedTerm.includes('後期') || normalizedTerm.includes('fall')) {
        if (normalizedTerm.includes('i') || normalizedTerm.includes('ⅰ') || normalizedTerm.includes('１') || 
            normalizedTerm.includes('1') || normalizedTerm.includes('一')) 
            return 'fall-1';
        if (normalizedTerm.includes('ii') || normalizedTerm.includes('ⅱ') || normalizedTerm.includes('２') || 
            normalizedTerm.includes('2') || normalizedTerm.includes('二')) 
            return 'fall-2';
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
            console.error('時間割更新時の色設定適用に失敗しました:', error);
        }
    }
    
    const days = ['', '月', '火', '水', '木', '金'];
    const periods = 6;
    let courses: CourseInfo[] = [];
    if (cachedCourses && cachedCourses.length > 0) {
        console.log('キャッシュされた講義情報を使用します', cachedCourses.length);
        courses = cachedCourses;
    } else {
        try {
            courses = fetchCoursesFromPortal();
            console.log('fetchCoursesFromPortal結果:', courses);
            if (!courses || courses.length === 0) {
                courses = extractCoursesFromPage();
                console.log('extractCoursesFromPage結果:', courses);
            }
            if (courses && courses.length > 0) {
                cachedCourses = courses;
            } else {
                courses = SAMPLE_COURSES;
            }
        } catch (error) {
            console.error('講義情報取得エラー:', error);
            courses = SAMPLE_COURSES;
        }
    }
    console.log(`選択された年度: ${year}, 学期: ${term}`);
    const filteredCourses = courses.filter(course => {
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
        const courseTermNumber = normalizedCourseTerm.includes('-') ? normalizedCourseTerm.split('-')[1] : '';
        const selectedTermNumber = normalizedSelectedTerm.includes('-') ? normalizedSelectedTerm.split('-')[1] : '';
        let termMatch = false;
        if (normalizedCourseTerm === normalizedSelectedTerm) {
            termMatch = true;
        } else if (courseTermBase === selectedTermBase && !normalizedSelectedTerm.includes('-')) {
            termMatch = true;
        } else if (courseTermBase === selectedTermBase && !normalizedCourseTerm.includes('-')) {
            termMatch = true;
        } else if (courseTermBase === selectedTermBase) {
            termMatch = false;
        } else {
            termMatch = false;
        }
        let termMatchReason = '';
        if (normalizedCourseTerm === normalizedSelectedTerm) {
            termMatchReason = '完全一致';
        } else if (courseTermBase === selectedTermBase && !normalizedSelectedTerm.includes('-')) {
            termMatchReason = '大分類一致（選択が大分類のみ）';
        } else if (courseTermBase === selectedTermBase && !normalizedCourseTerm.includes('-')) {
            termMatchReason = '大分類一致（講義が大分類のみ）';
        } else if (courseTermBase === selectedTermBase) {
            termMatchReason = '大分類一致だが細分類不一致（表示しない）';
        } else {
            termMatchReason = '不一致';
        }
        console.log(`フィルタリング - 講義: ${course.title}, 保存年度: ${course.academicYear || "なし"}, 抽出年度: ${courseYear || "不明"}, 選択年度: ${year}, 学期: ${course.term}, 正規化: ${normalizedCourseTerm}, 年度一致: ${isYearMatching}, 学期一致: ${termMatch}, 理由: ${termMatchReason}`);
        return isYearMatching && termMatch;
    });
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
                cell.style.height = '120px';
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
                        console.log(`セル配置: ${day}${period} - ${course.title}`);
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

/**
 * ダミーの時間割データを生成
 * @param term 学期
 * @returns ダミーの時間割データ
 */
function generateDummyTimetable(term: string) {
    const courses = [
        { 
            title: '基礎数学A', 
            room: '工学部2号館241', 
            instructor: '鈴木教授' 
        },
        { 
            title: 'プログラミング演習', 
            room: '情報学部実習室301', 
            instructor: '佐藤教授' 
        },
        { 
            title: '英語コミュニケーション', 
            room: '全学教育棠301', 
            instructor: 'Smith教授' 
        },
        { 
            title: '物理学概論', 
            room: '理学部講義室103', 
            instructor: '田中教授' 
        },
        { 
            title: 'データ構造とアルゴリズム', 
            room: '情報学部講義室201', 
            instructor: '伊藤教授' 
        },
        { 
            title: '微分方程式', 
            room: '工学部3号館301', 
            instructor: '高橋教授' 
        },
        { 
            title: '情報理論', 
            room: '情報学部講義室301', 
            instructor: '渡辺教授' 
        },
        { 
            title: '統計学', 
            room: '経済学部201', 
            instructor: '山田教授' 
        },
        { 
            title: 'システム設計', 
            room: '工学部1号館154', 
            instructor: '中村教授' 
        }
    ];
    
    // 曜日と時限の配列
    const days = ['月', '火', '水', '木', '金'];
    const periods = 6;
    
    // 空の時間割を作成
    const timetable: any = {};
    days.forEach(day => {
        timetable[day] = {};
    });
    
    // 学期によって異なるダミーデータを生成
    const seed = term === 'spring' ? 0 : 
                term === 'spring-1' ? 1 : 
                term === 'spring-2' ? 2 :
                term === 'fall' ? 3 :
                term === 'fall-1' ? 4 : 5;
    
    // 乱数を使ってランダムな時間割を生成（ただし学期ごとに固定）
    for (let courseIndex = 0; courseIndex < courses.length; courseIndex++) {
        const dayIndex = (courseIndex + seed) % days.length;
        const period = ((courseIndex + seed) % periods) + 1;
        const day = days[dayIndex];
        
        // その曜日・時限が空いていれば授業を配置
        if (!timetable[day][period]) {
            timetable[day][period] = courses[courseIndex];
        }
    }
    
    return timetable;
}
