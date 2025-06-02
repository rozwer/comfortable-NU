/**
 * 時間割エクスポート機能
 * 時間割をHTML/CSSで美しく描画し、PNG画像として出力する
 */

import { CourseInfo, normalizeTerm } from './timetable';
import { fromStorage, toStorage } from '../storage';

// 講義の色設定型
interface CourseColorSettings {
    [courseTitle: string]: string;
}

// エクスポート設定型
interface ExportSettings {
    title: string;
    showInstructor: boolean;
    showRoom: boolean;
    fontSize: number;
    colorSettings: CourseColorSettings;
}

// 色のプリセット
const COLOR_PRESETS = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
    '#F8C471', '#82E0AA', '#F1948A', '#85C7F2', '#D7BDE2'
];

// 色設定のストレージキー
const EXPORT_COLOR_STORAGE_KEY = 'cs-timetable-export-colors';
const EXPORT_SETTINGS_STORAGE_KEY = 'cs-timetable-export-settings';
const CLASSROOM_STORAGE_KEY = 'cs-timetable-classrooms';

// 教室情報を取得
async function loadClassroomInfo(hostname: string): Promise<Record<string, string>> {
    try {
        const result = await fromStorage<Record<string, string> | undefined>(hostname, CLASSROOM_STORAGE_KEY, d => d || {});
        return result || {};
    } catch (error) {
        console.error('教室情報読み込みエラー:', error);
        return {};
    }
}

/**
 * 時間割エクスポートモーダルを表示
 */
export async function showTimetableExportModal(courses: CourseInfo[], year: string, term: string): Promise<void> {
    // 既存のエクスポートモーダルがあれば削除
    const existingModal = document.querySelector('.cs-timetable-export-modal');
    if (existingModal) {
        existingModal.remove();
    }

    // モーダルコンテナを作成
    const modalContainer = document.createElement('div');
    modalContainer.className = 'cs-tact-modal cs-timetable-export-modal';
    modalContainer.style.zIndex = '10002';

    // モーダルヘッダー
    const modalHeader = document.createElement('div');
    modalHeader.className = 'cs-tact-modal-header';

    const modalTitle = document.createElement('h2');
    modalTitle.textContent = '時間割エクスポート';
    modalHeader.appendChild(modalTitle);

    const closeButton = document.createElement('button');
    closeButton.textContent = '×';
    closeButton.className = 'cs-tact-modal-close';
    closeButton.addEventListener('click', () => modalContainer.remove());
    modalHeader.appendChild(closeButton);

    // モーダルコンテンツ
    const modalContent = document.createElement('div');
    modalContent.className = 'cs-tact-modal-content';
    modalContent.style.maxHeight = '80vh';
    modalContent.style.overflowY = 'auto';

    // 設定セクション
    const settingsSection = createSettingsSection(courses, year, term);
    modalContent.appendChild(settingsSection);

    // プレビューセクション
    const previewSection = createPreviewSection();
    modalContent.appendChild(previewSection);

    // ボタンセクション
    const buttonSection = createButtonSection();
    modalContent.appendChild(buttonSection);

    // モーダルを組み立て
    modalContainer.appendChild(modalHeader);
    modalContainer.appendChild(modalContent);

    // ページにモーダルを追加
    document.body.appendChild(modalContainer);

    // 保存された設定を読み込み
    const hostname = window.location.hostname;
    const savedSettings = await loadExportSettings(hostname);
    if (savedSettings) {
        applyExportSettings(savedSettings);
    }

    // 初期プレビューを生成
    await updatePreview(courses, year, term);
}

/**
 * 設定セクションを作成
 */
function createSettingsSection(courses: CourseInfo[], year: string, term: string): HTMLElement {
    const section = document.createElement('div');
    section.className = 'cs-export-settings';
    section.style.marginBottom = '20px';

    const sectionTitle = document.createElement('h3');
    sectionTitle.textContent = 'エクスポート設定';
    sectionTitle.style.marginBottom = '15px';
    section.appendChild(sectionTitle);

    // タイトル設定
    const titleRow = document.createElement('div');
    titleRow.style.display = 'flex';
    titleRow.style.alignItems = 'center';
    titleRow.style.marginBottom = '10px';

    const titleLabel = document.createElement('label');
    titleLabel.textContent = 'タイトル:';
    titleLabel.style.width = '100px';
    titleLabel.style.marginRight = '10px';
    titleRow.appendChild(titleLabel);

    const titleInput = document.createElement('input');
    titleInput.type = 'text';
    titleInput.id = 'cs-export-title';
    titleInput.value = `${year}年 時間割`;
    titleInput.style.flex = '1';
    titleInput.style.padding = '5px';
    titleRow.appendChild(titleInput);

    section.appendChild(titleRow);

    // 表示オプション
    const optionsTitle = document.createElement('h4');
    optionsTitle.textContent = '表示オプション';
    optionsTitle.style.marginBottom = '10px';
    optionsTitle.style.marginTop = '15px';
    section.appendChild(optionsTitle);

    // 担当者表示
    const instructorRow = document.createElement('div');
    instructorRow.style.marginBottom = '8px';

    const instructorCheckbox = document.createElement('input');
    instructorCheckbox.type = 'checkbox';
    instructorCheckbox.id = 'cs-export-instructor';
    instructorCheckbox.checked = true;
    instructorRow.appendChild(instructorCheckbox);

    const instructorLabel = document.createElement('label');
    instructorLabel.htmlFor = 'cs-export-instructor';
    instructorLabel.textContent = '担当者を表示';
    instructorLabel.style.marginLeft = '8px';
    instructorRow.appendChild(instructorLabel);

    section.appendChild(instructorRow);

    // 教室表示
    const roomRow = document.createElement('div');
    roomRow.style.marginBottom = '8px';

    const roomCheckbox = document.createElement('input');
    roomCheckbox.type = 'checkbox';
    roomCheckbox.id = 'cs-export-room';
    roomCheckbox.checked = true;
    roomRow.appendChild(roomCheckbox);

    const roomLabel = document.createElement('label');
    roomLabel.htmlFor = 'cs-export-room';
    roomLabel.textContent = '教室を表示';
    roomLabel.style.marginLeft = '8px';
    roomRow.appendChild(roomLabel);

    section.appendChild(roomRow);

    // フォントサイズ
    const fontSizeRow = document.createElement('div');
    fontSizeRow.style.display = 'flex';
    fontSizeRow.style.alignItems = 'center';
    fontSizeRow.style.marginBottom = '10px';

    const fontSizeLabel = document.createElement('label');
    fontSizeLabel.textContent = 'フォントサイズ:';
    fontSizeLabel.style.width = '100px';
    fontSizeLabel.style.marginRight = '10px';
    fontSizeRow.appendChild(fontSizeLabel);

    const fontSizeSelect = document.createElement('select');
    fontSizeSelect.id = 'cs-export-fontsize';
    fontSizeSelect.style.padding = '5px';
    
    const fontSizes = [
        { value: '10', text: '小 (10px)' },
        { value: '12', text: '標準 (12px)' },
        { value: '14', text: '大 (14px)' },
        { value: '16', text: '特大 (16px)' }
    ];

    fontSizes.forEach(size => {
        const option = document.createElement('option');
        option.value = size.value;
        option.textContent = size.text;
        if (size.value === '12') option.selected = true;
        fontSizeSelect.appendChild(option);
    });

    fontSizeRow.appendChild(fontSizeSelect);
    section.appendChild(fontSizeRow);

    // 講義色設定
    const colorTitle = document.createElement('h4');
    colorTitle.textContent = '講義色設定';
    colorTitle.style.marginBottom = '10px';
    colorTitle.style.marginTop = '15px';
    section.appendChild(colorTitle);

    const colorGrid = document.createElement('div');
    colorGrid.className = 'cs-export-color-grid';
    colorGrid.style.display = 'grid';
    colorGrid.style.gridTemplateColumns = 'repeat(auto-fit, minmax(200px, 1fr))';
    colorGrid.style.gap = '10px';
    colorGrid.style.maxHeight = '200px';
    colorGrid.style.overflowY = 'auto';
    colorGrid.style.border = '1px solid #ddd';
    colorGrid.style.padding = '10px';
    colorGrid.style.borderRadius = '4px';

    // 講義ごとの色設定
    const uniqueCourses = courses.filter((course, index, self) => 
        index === self.findIndex(c => c.title.split('(')[0].trim() === course.title.split('(')[0].trim())
    );

    uniqueCourses.forEach((course, index) => {
        const courseTitle = course.title.split('(')[0].trim();
        const colorRow = document.createElement('div');
        colorRow.style.display = 'flex';
        colorRow.style.alignItems = 'center';
        colorRow.style.marginBottom = '5px';

        const colorInput = document.createElement('input');
        colorInput.type = 'color';
        colorInput.value = COLOR_PRESETS[index % COLOR_PRESETS.length];
        colorInput.dataset.courseTitle = courseTitle;
        colorInput.className = 'cs-course-color-input';
        colorInput.style.width = '30px';
        colorInput.style.height = '30px';
        colorInput.style.marginRight = '10px';
        colorInput.style.border = 'none';
        colorInput.style.borderRadius = '4px';
        colorInput.addEventListener('change', () => updatePreview(courses, year, term));
        colorRow.appendChild(colorInput);

        const courseLabel = document.createElement('span');
        courseLabel.textContent = courseTitle;
        courseLabel.style.fontSize = '12px';
        courseLabel.style.flex = '1';
        colorRow.appendChild(courseLabel);

        colorGrid.appendChild(colorRow);
    });

    section.appendChild(colorGrid);

    // イベントリスナーを追加
    [titleInput, instructorCheckbox, roomCheckbox, fontSizeSelect].forEach(element => {
        element.addEventListener('change', () => updatePreview(courses, year, term));
    });

    return section;
}

/**
 * プレビューセクションを作成
 */
function createPreviewSection(): HTMLElement {
    const section = document.createElement('div');
    section.className = 'cs-export-preview';
    section.style.marginBottom = '20px';

    const sectionTitle = document.createElement('h3');
    sectionTitle.textContent = 'プレビュー';
    sectionTitle.style.marginBottom = '15px';
    section.appendChild(sectionTitle);

    const previewContainer = document.createElement('div');
    previewContainer.id = 'cs-export-preview-container';
    previewContainer.style.border = '1px solid #ddd';
    previewContainer.style.borderRadius = '4px';
    previewContainer.style.padding = '20px';
    previewContainer.style.backgroundColor = '#f9f9f9';
    previewContainer.style.maxHeight = '500px';
    previewContainer.style.overflowY = 'auto';
    section.appendChild(previewContainer);

    return section;
}

/**
 * ボタンセクションを作成
 */
function createButtonSection(): HTMLElement {
    const section = document.createElement('div');
    section.className = 'cs-export-buttons';
    section.style.display = 'flex';
    section.style.justifyContent = 'flex-end';
    section.style.gap = '10px';

    const saveSettingsButton = document.createElement('button');
    saveSettingsButton.textContent = '設定を保存';
    saveSettingsButton.className = 'cs-btn cs-btn-secondary';
    saveSettingsButton.addEventListener('click', saveExportSettings);
    section.appendChild(saveSettingsButton);

    const exportButton = document.createElement('button');
    exportButton.textContent = 'PNG出力';
    exportButton.className = 'cs-btn cs-btn-primary';
    exportButton.addEventListener('click', exportToPNG);
    section.appendChild(exportButton);

    return section;
}

/**
 * プレビューを更新
 */
async function updatePreview(courses: CourseInfo[], year: string, term: string): Promise<void> {
    const previewContainer = document.getElementById('cs-export-preview-container');
    if (!previewContainer) return;

    const settings = collectExportSettings();
    const timetableHTML = await generateTimetableHTML(courses, year, term, settings);
    
    previewContainer.innerHTML = timetableHTML;
}

/**
 * 設定を収集
 */
function collectExportSettings(): ExportSettings {
    const titleInput = document.getElementById('cs-export-title') as HTMLInputElement;
    const instructorCheckbox = document.getElementById('cs-export-instructor') as HTMLInputElement;
    const roomCheckbox = document.getElementById('cs-export-room') as HTMLInputElement;
    const fontSizeSelect = document.getElementById('cs-export-fontsize') as HTMLSelectElement;
    const colorInputs = document.querySelectorAll('.cs-course-color-input') as NodeListOf<HTMLInputElement>;

    const colorSettings: CourseColorSettings = {};
    colorInputs.forEach(input => {
        const courseTitle = input.dataset.courseTitle;
        if (courseTitle) {
            colorSettings[courseTitle] = input.value;
        }
    });

    return {
        title: titleInput?.value || `${new Date().getFullYear()}年 時間割`,
        showInstructor: instructorCheckbox?.checked || false,
        showRoom: roomCheckbox?.checked || false,
        fontSize: parseInt(fontSizeSelect?.value || '12'),
        colorSettings
    };
}

/**
 * 美しい時間割HTMLを生成
 */
async function generateTimetableHTML(courses: CourseInfo[], year: string, term: string, settings: ExportSettings): Promise<string> {
    const days = ['月', '火', '水', '木', '金'];
    const periods = 6;
    
    // 教室情報を取得
    const hostname = window.location.hostname;
    const classroomMap = await loadClassroomInfo(hostname);
    
    // 時間割データを構築
    const timetableData: { [key: string]: CourseInfo[] } = {};
    
    courses.forEach(course => {
        course.dayPeriod.forEach(dp => {
            if (!timetableData[dp]) {
                timetableData[dp] = [];
            }
            timetableData[dp].push(course);
        });
    });

    let html = `
        <div class="export-timetable" style="
            font-family: 'Helvetica Neue', Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            color: #333;
            min-width: 800px;
        ">
            <div class="export-header" style="
                text-align: center;
                margin-bottom: 30px;
                color: white;
            ">
                <h1 style="
                    margin: 0 0 10px 0;
                    font-size: 28px;
                    font-weight: bold;
                    text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
                ">${settings.title}</h1>
                <p style="
                    margin: 0;
                    font-size: 16px;
                    opacity: 0.9;
                ">${year}年度 ${getTermDisplayName(term)}</p>
            </div>
            
            <div class="export-table-container" style="
                background: white;
                border-radius: 8px;
                padding: 20px;
                box-shadow: 0 5px 15px rgba(0,0,0,0.1);
            ">
                <table style="
                    width: 100%;
                    border-collapse: collapse;
                    table-layout: fixed;
                ">
                    <thead>
                        <tr>
                            <th style="
                                background: linear-gradient(135deg, #4a5d73 0%, #5a6d83 100%);
                                color: white;
                                padding: 15px 8px;
                                text-align: center;
                                font-weight: bold;
                                font-size: ${settings.fontSize}px;
                                border: 1px solid #ddd;
                                width: 60px;
                            ">時限</th>`;

    days.forEach(day => {
        html += `
                            <th style="
                                background: linear-gradient(135deg, #4a5d73 0%, #5a6d83 100%);
                                color: white;
                                padding: 15px 8px;
                                text-align: center;
                                font-weight: bold;
                                font-size: ${settings.fontSize + 2}px;
                                border: 1px solid #ddd;
                                width: calc((100% - 60px) / 5);
                            ">${day}曜日</th>`;
    });

    html += `
                        </tr>
                    </thead>
                    <tbody>`;

    for (let period = 1; period <= periods; period++) {
        html += `
                        <tr>
                            <td style="
                                background: #f8f9fa;
                                text-align: center;
                                font-weight: bold;
                                font-size: ${settings.fontSize}px;
                                padding: 8px;
                                border: 1px solid #ddd;
                                vertical-align: middle;
                            ">${period}</td>`;

        days.forEach(day => {
            const cellKey = `${day}${period}`;
            const cellCourses = timetableData[cellKey] || [];
            
            html += `
                            <td style="
                                border: 1px solid #ddd;
                                padding: 8px;
                                vertical-align: top;
                                height: 120px;
                                background: #fafafa;
                            ">`;

            cellCourses.forEach(course => {
                const courseTitle = course.title.split('(')[0].trim();
                const backgroundColor = settings.colorSettings[courseTitle] || '#e0e0e0';
                
                // 色の明度を計算してテキスト色を決定
                const textColor = getContrastTextColor(backgroundColor);
                
                html += `
                                <div style="
                                    background: ${backgroundColor};
                                    color: ${textColor};
                                    padding: 8px;
                                    border-radius: 6px;
                                    margin-bottom: 4px;
                                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                                    font-size: ${settings.fontSize}px;
                                    line-height: 1.3;
                                ">
                                    <div style="
                                        font-weight: bold;
                                        margin-bottom: 4px;
                                        font-size: ${settings.fontSize + 1}px;
                                    ">${courseTitle}</div>`;

                if (settings.showRoom) {
                    const classroom = classroomMap[course.title] || course.room;
                    if (classroom) {
                        html += `
                                    <div style="
                                        font-size: ${settings.fontSize - 1}px;
                                        opacity: 0.9;
                                        margin-bottom: 2px;
                                    ">📍 ${classroom}</div>`;
                    }
                }

                if (settings.showInstructor && course.instructor) {
                    html += `
                                    <div style="
                                        font-size: ${settings.fontSize - 1}px;
                                        opacity: 0.9;
                                    ">👨‍🏫 ${course.instructor}</div>`;
                }

                html += `
                                </div>`;
            });

            html += `
                            </td>`;
        });

        html += `
                        </tr>`;
    }

    html += `
                    </tbody>
                </table>
            </div>
            
            <div class="export-footer" style="
                text-align: center;
                margin-top: 20px;
                color: white;
                font-size: 12px;
                opacity: 0.8;
            ">
                Generated by Comfortable Sakai Extension
            </div>
        </div>`;

    return html;
}

/**
 * 学期表示名を取得
 */
function getTermDisplayName(term: string): string {
    const termMap: { [key: string]: string } = {
        'spring': '春学期',
        'spring-1': '春学期Ⅰ',
        'spring-2': '春学期Ⅱ',
        'fall': '秋学期',
        'fall-1': '秋学期Ⅰ',
        'fall-2': '秋学期Ⅱ'
    };
    return termMap[term] || term;
}

/**
 * 背景色に対するコントラストの良いテキスト色を取得
 */
function getContrastTextColor(backgroundColor: string): string {
    // HEX色をRGBに変換
    const hex = backgroundColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // 明度を計算
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    
    // 明度が128以上なら黒、未満なら白
    return brightness > 128 ? '#333333' : '#ffffff';
}

/**
 * PNG出力
 */
async function exportToPNG(): Promise<void> {
    const previewContainer = document.getElementById('cs-export-preview-container');
    if (!previewContainer) return;

    const exportButton = document.querySelector('.cs-export-buttons .cs-btn-primary') as HTMLButtonElement;
    if (exportButton) {
        exportButton.disabled = true;
        exportButton.textContent = 'エクスポート中...';
    }

    try {
        // html2canvasライブラリを動的に読み込み
        await loadHtml2Canvas();
        
        const canvas = await (window as any).html2canvas(previewContainer, {
            backgroundColor: null,
            scale: 2, // 高解像度
            useCORS: true,
            allowTaint: true,
            width: previewContainer.scrollWidth,
            height: previewContainer.scrollHeight
        });

        // PNGとしてダウンロード
        const link = document.createElement('a');
        link.download = `timetable_${new Date().getFullYear()}_${new Date().getMonth() + 1}_${new Date().getDate()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();

    } catch (error) {
        console.error('PNG出力エラー:', error);
        alert('PNG出力に失敗しました。しばらく時間をおいてお試しください。');
    } finally {
        if (exportButton) {
            exportButton.disabled = false;
            exportButton.textContent = 'PNG出力';
        }
    }
}

/**
 * html2canvasライブラリを動的に読み込み
 */
async function loadHtml2Canvas(): Promise<void> {
    return new Promise((resolve, reject) => {
        if ((window as any).html2canvas) {
            resolve();
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('html2canvasの読み込みに失敗しました'));
        document.head.appendChild(script);
    });
}

/**
 * エクスポート設定を保存
 */
async function saveExportSettings(): Promise<void> {
    try {
        const settings = collectExportSettings();
        const hostname = window.location.hostname;
        
        await toStorage(hostname, EXPORT_SETTINGS_STORAGE_KEY, settings);
        alert('設定を保存しました');
    } catch (error) {
        console.error('設定保存エラー:', error);
        alert('設定の保存に失敗しました');
    }
}

/**
 * 保存されたエクスポート設定を読み込み
 */
async function loadExportSettings(hostname: string): Promise<ExportSettings | null> {
    try {
        const result = await fromStorage<ExportSettings | undefined>(hostname, EXPORT_SETTINGS_STORAGE_KEY, d => d);
        return result || null;
    } catch (error) {
        console.error('設定読み込みエラー:', error);
        return null;
    }
}

/**
 * エクスポート設定を適用
 */
function applyExportSettings(settings: ExportSettings): void {
    const titleInput = document.getElementById('cs-export-title') as HTMLInputElement;
    const instructorCheckbox = document.getElementById('cs-export-instructor') as HTMLInputElement;
    const roomCheckbox = document.getElementById('cs-export-room') as HTMLInputElement;
    const fontSizeSelect = document.getElementById('cs-export-fontsize') as HTMLSelectElement;
    const colorInputs = document.querySelectorAll('.cs-course-color-input') as NodeListOf<HTMLInputElement>;

    if (titleInput) titleInput.value = settings.title;
    if (instructorCheckbox) instructorCheckbox.checked = settings.showInstructor;
    if (roomCheckbox) roomCheckbox.checked = settings.showRoom;
    if (fontSizeSelect) fontSizeSelect.value = String(settings.fontSize);

    colorInputs.forEach(input => {
        const courseTitle = input.dataset.courseTitle;
        if (courseTitle && settings.colorSettings[courseTitle]) {
            input.value = settings.colorSettings[courseTitle];
        }
    });
}
