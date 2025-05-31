/**
 * TACT旧機能バックアップファイル
 * 以前のバージョンの機能保持用（バックアップ）
 */
/**
 * TACT Portal extension features
 * このモジュールはTACTポータルに新しい機能を追加します
 */

import { MemoUI } from './memo-ui';

/**
 * TACTポータルかどうかを判定する
 * @returns TACTポータルであればtrue、そうでなければfalse
 */
export const isTactPortal = (): boolean => {
    // URLに "tact.ac.thers.ac.jp" が含まれているかチェック
    return window.location.href.includes('tact.ac.thers.ac.jp');
};

/**
 * TACTポータルのツールメニューに新しいタブを追加する
 * @param tabName タブの名前
 * @param iconClass アイコンのクラス名
 * @param title タイトル（ツールチップ）
 * @param clickHandler クリック時のイベントハンドラ
 */
export const addCustomToolTab = (
    tabName: string,
    iconClass: string,
    title: string,
    clickHandler: () => void
): void => {
    // ツールメニューを取得
    const toolMenu = document.querySelector('#toolMenu ul');
    if (!toolMenu) {
        console.error('ツールメニューが見つかりません');
        return;
    }

    // 新しいタブのHTML要素を作成
    const newTab = document.createElement('li');
    newTab.className = 'cs-custom-tab'; // カスタムスタイル用のクラス
    
    const tabLink = document.createElement('a');
    tabLink.className = 'Mrphs-toolsNav__menuitem--link';
    tabLink.href = 'javascript:void(0);'; // JavaScriptで処理するため、リンク先はなし
    tabLink.title = title;
    
    // アイコン要素
    const iconDiv = document.createElement('div');
    iconDiv.className = `Mrphs-toolsNav__menuitem--icon ${iconClass}`;
    
    // アイコンが表示されない場合のフォールバック
    if (!iconClass.includes('icon-sakai') || iconClass === 'cs-custom-icon') {
        iconDiv.textContent = '📝';
        iconDiv.style.fontSize = '16px';
        iconDiv.style.display = 'flex';
        iconDiv.style.alignItems = 'center';
        iconDiv.style.justifyContent = 'center';
    }
    
    // タイトル要素
    const titleDiv = document.createElement('div');
    titleDiv.className = 'Mrphs-toolsNav__menuitem--title';
    titleDiv.textContent = tabName;
    
    // ステータスブロック（空）
    const statusDiv = document.createElement('div');
    statusDiv.className = 'Mrphs-toolsNav__menuitem--status-block';
    
    // 要素を組み合わせる
    tabLink.appendChild(iconDiv);
    tabLink.appendChild(titleDiv);
    tabLink.appendChild(statusDiv);
    newTab.appendChild(tabLink);
    
    // クリックイベントを追加
    tabLink.addEventListener('click', clickHandler);
    
    // 展開/折りたたみボタンの前に挿入
    const toggleLi = document.querySelector('#toolsNav-toggle-li');
    if (toggleLi) {
        toolMenu.insertBefore(newTab, toggleLi);
    } else {
        // 展開/折りたたみボタンが見つからない場合は最後に追加
        toolMenu.appendChild(newTab);
    }
};

/**
 * タブのコンテンツを表示するためのモーダルを作成
 * @param title モーダルのタイトル
 * @param content モーダルのコンテンツ（HTML文字列またはDOM要素）
 */
export const showTabContent = (title: string, content: string | HTMLElement): void => {
    // 既存のモーダルがあれば削除
    const existingModal = document.querySelector('.cs-tact-modal');
    if (existingModal) {
        existingModal.remove();
    }

    // モーダルコンテナを作成
    const modalContainer = document.createElement('div');
    modalContainer.className = 'cs-tact-modal';
    
    // モーダルのヘッダー
    const modalHeader = document.createElement('div');
    modalHeader.className = 'cs-tact-modal-header';
    
    const modalTitle = document.createElement('h2');
    modalTitle.textContent = title;
    modalHeader.appendChild(modalTitle);
    
    const closeButton = document.createElement('button');
    closeButton.textContent = '×';
    closeButton.className = 'cs-tact-modal-close';
    closeButton.addEventListener('click', () => modalContainer.remove());
    modalHeader.appendChild(closeButton);
    
    // モーダルのコンテンツ
    const modalContent = document.createElement('div');
    modalContent.className = 'cs-tact-modal-content';
    if (typeof content === 'string') {
        modalContent.innerHTML = content;
    } else {
        modalContent.appendChild(content);
    }
    
    // モーダルを組み立てる
    modalContainer.appendChild(modalHeader);
    modalContainer.appendChild(modalContent);
    
    // ページにモーダルを追加
    document.body.appendChild(modalContainer);
};

/**
 * CSSファイルを動的に読み込む
 */
function loadCSS(href: string): void {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
}

/**
 * メモ機能タブを追加
 */
export const addMemoTab = (): void => {
    // メモ機能用のCSSを読み込み
    const cssPath = chrome.runtime.getURL('css/memo-styles.css');
    loadCSS(cssPath);

    // 複数のアイコンクラスを試す
    const iconClasses = [
        'icon-sakai--sakai-assignment-grades',
        'icon-sakai--sakai-gradebook2',
        'icon-sakai--sakai-notebook',
        'icon-sakai--sakai-notes',
        'fa fa-sticky-note',
        'fa fa-file-text'
    ];

    // 利用可能なアイコンクラスを検出
    let iconClass = 'cs-custom-icon';
    for (const cls of iconClasses) {
        // 既存のツールでこのアイコンが使われているかチェック
        const existingIcon = document.querySelector(`.${cls.replace(/\s+/g, '.')}`);
        if (existingIcon) {
            iconClass = `${cls} cs-custom-icon`;
            break;
        }
    }

    console.log('使用するアイコンクラス:', iconClass);

    // メモタブを追加
    addCustomToolTab(
        'メモ',
        iconClass,
        '講義メモ管理',
        () => {
            const memoUI = new MemoUI();
            const content = memoUI.createMemoTabContent();
            showTabContent('📝 講義メモ管理', content);
        }
    );
};



/**
 * すべてのTACTカスタム機能を初期化
 */
export const initializeTactFeatures = (): void => {
    if (!isTactPortal()) {
        return;
    }

    // メモ機能を追加
    addMemoTab();
    
    console.log('TACT Portal カスタム機能が初期化されました');
};
