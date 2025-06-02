/**
 * TACTポータル拡張機能のメインエントリーポイント
 * メモ機能とフォルダ機能の統合管理と初期化
 */
/**
 * TACTポータル拡張機能のメインエントリーポイント
 * メモ機能とフォルダ機能の統合管理
 */
/**
 * TACT portal extension features
 * このモジュールはTACTポータルに新しい機能を追加します
 */

// メモ機能のインポート
import { MemoManager } from './memo';
import { MemoUI } from './memo-ui';
import { i18nMessage } from '../chrome/index';

/**
 * 講義メモのデータ構造
 */
interface LectureNote {
    id: string;
    lectureId: string;
    lectureName: string;
    note: string;
    links: LinkItem[];
    createdAt: Date;
    updatedAt: Date;
}

/**
 * リンクアイテムのデータ構造
 */
interface LinkItem {
    id: string;
    url: string;
    title: string;
    description?: string;
}

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
 * CSS ファイルを動的に読み込む
 * @param cssFileName CSSファイル名
 */
const loadMemoCSS = async (cssFileName: string): Promise<void> => {
    return new Promise((resolve) => {
        const existingLink = document.querySelector(`link[href*="${cssFileName}"]`);
        if (existingLink) {
            resolve();
            return;
        }

        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.type = 'text/css';
        link.href = chrome.runtime.getURL(`css/${cssFileName}`);
        link.onload = () => resolve();
        document.head.appendChild(link);
    });
};

/**
 * カスタムタブを追加
 */
export const addSampleCustomTabs = (): void => {
    if (!isTactPortal()) {
        return;
    }

    // メモタブ
    addCustomToolTab(
        'メモ',
        'icon-sakai--sakai-assignment-grades cs-custom-icon',
        '講義メモ管理',
        async () => {
            try {
                // CSS を読み込み
                await loadMemoCSS('memo-styles.css');
                
                // メモUIを初期化
                const memoUI = new MemoUI();
                
                // メモUIを表示
                const memoContainer = memoUI.createMemoTabContent();
                showTabContent(i18nMessage('memo_ui_title').replace('📝 ', ''), memoContainer);
            } catch (error) {
                console.error('メモ機能の初期化に失敗しました:', error);
                showTabContent(i18nMessage('memo_ui_title').replace('📝 ', ''), '<p>メモ機能の読み込みに失敗しました。ページを再読み込みしてください。</p>');
            }
        }
    );

    // 掲示板タブ
    addCustomToolTab(
        '掲示板',
        'icon-sakai--sakai-forums cs-custom-icon',
        i18nMessage('tact_forum_title'),
        () => {
            // 掲示板のコンテンツ
            const forumContainer = document.createElement('div');
            forumContainer.className = 'cs-tact-forum';

            const forumHeader = document.createElement('div');
            forumHeader.className = 'cs-forum-header';
            
            const forumTitle = document.createElement('h3');
            forumTitle.textContent = i18nMessage('tact_forum_title');
            forumHeader.appendChild(forumTitle);
            
            const newPostButton = document.createElement('button');
            newPostButton.textContent = i18nMessage('tact_forum_new_post');
            newPostButton.className = 'cs-forum-new-post-btn';
            newPostButton.addEventListener('click', () => {
                alert(i18nMessage('tact_forum_new_post_development'));
            });
            
            forumHeader.appendChild(newPostButton);
            forumContainer.appendChild(forumHeader);

            // 掲示板の説明
            const forumDescription = document.createElement('p');
            forumDescription.textContent = i18nMessage('tact_forum_description');
            forumContainer.appendChild(forumDescription);
            
            // カテゴリータブ
            const forumCategoryTabs = document.createElement('div');
            forumCategoryTabs.className = 'cs-forum-category-tabs';
            
            const categories = [
                { key: 'tact_forum_category_general', default: '一般' },
                { key: 'tact_forum_category_class', default: '授業関連' },
                { key: 'tact_forum_category_assignment', default: '課題質問' },
                { key: 'tact_forum_category_campus', default: 'キャンパスライフ' }
            ];
            
            categories.forEach((category, index) => {
                const tab = document.createElement('button');
                tab.className = index === 0 ? 'cs-forum-category-tab active' : 'cs-forum-category-tab';
                tab.textContent = i18nMessage(category.key);
                tab.addEventListener('click', (e) => {
                    document.querySelectorAll('.cs-forum-category-tab').forEach(t => 
                        t.classList.remove('active'));
                    (e.target as HTMLElement).classList.add('active');
                    // カテゴリの切り替え処理（実際の実装では）
                });
                forumCategoryTabs.appendChild(tab);
            });
            
            forumContainer.appendChild(forumCategoryTabs);
            
            // 投稿リスト
            const postList = document.createElement('div');
            postList.className = 'cs-forum-post-list';
            
            // サンプル投稿
            const samplePosts = [
                {
                    title: '期末レポートの提出方法について',
                    author: '匿名',
                    date: '2025/05/10',
                    replies: 5,
                    content: 'レポートの提出方法がわかりません。TACTのどこから提出するのでしょうか？'
                },
                {
                    title: '明日の授業について',
                    author: '学生A',
                    date: '2025/05/11',
                    replies: 3,
                    content: '明日の授業は教室変更があるとの連絡がありましたが、新しい教室をご存知の方はいますか？'
                },
                {
                    title: '参考書について質問です',
                    author: '学生B',
                    date: '2025/05/12',
                    replies: 0,
                    content: '授業で紹介された参考書を探しているのですが、図書館にはありませんでした。電子版などはありますか？'
                }
            ];
            
            samplePosts.forEach(post => {
                const postItem = document.createElement('div');
                postItem.className = 'cs-forum-post';
                
                const postHeader = document.createElement('div');
                postHeader.className = 'cs-forum-post-header';
                
                const postTitle = document.createElement('h4');
                postTitle.className = 'cs-forum-post-title';
                postTitle.textContent = post.title;
                
                const postMeta = document.createElement('div');
                postMeta.className = 'cs-forum-post-meta';
                postMeta.innerHTML = `${i18nMessage('tact_forum_post_by')}${post.author} | ${i18nMessage('tact_forum_post_date')}${post.date} | ${i18nMessage('tact_forum_post_replies')}${post.replies}`;
                
                postHeader.appendChild(postTitle);
                postHeader.appendChild(postMeta);
                
                const postContent = document.createElement('p');
                postContent.className = 'cs-forum-post-content';
                postContent.textContent = post.content;
                
                const postActions = document.createElement('div');
                postActions.className = 'cs-forum-post-actions';
                
                const replyButton = document.createElement('button');
                replyButton.className = 'cs-forum-reply-btn';
                replyButton.textContent = i18nMessage('tact_forum_reply');
                replyButton.addEventListener('click', () => {
                    alert(i18nMessage('tact_forum_reply_development'));
                });
                
                postActions.appendChild(replyButton);
                
                postItem.appendChild(postHeader);
                postItem.appendChild(postContent);
                postItem.appendChild(postActions);
                
                postList.appendChild(postItem);
            });
            
            forumContainer.appendChild(postList);
            
            showTabContent(i18nMessage('tact_forum_title'), forumContainer);
        }
    );
};
