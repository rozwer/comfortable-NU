/**
 * TACT Portal extension features
 * このモジュールはTACTポータルに新しい機能を追加します
 */

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
 * カスタムタブを追加
 */
export const addSampleCustomTabs = (): void => {
    // フォルダタブ
    addCustomToolTab(
        'フォルダ',
        'icon-sakai--sakai-resources cs-custom-icon',
        'カスタムフォルダ',
        () => {
            const content = `
                <div class="cs-tact-folder">
                    <h3>カスタムフォルダ</h3>
                    <p>自分専用のファイル管理フォルダです</p>
                    
                    <div class="cs-folder-section">
                        <div class="cs-folder-header">
                            <h4>授業資料</h4>
                            <button class="cs-folder-add-btn">新規追加</button>
                        </div>
                        <ul class="cs-folder-list">
                            <li class="cs-folder-item">
                                <span class="cs-folder-item-icon">📄</span>
                                <span class="cs-folder-item-name">授業ノート_2025前期.pdf</span>
                                <div class="cs-folder-item-actions">
                                    <button class="cs-folder-action-btn">📝</button>
                                    <button class="cs-folder-action-btn">🗑️</button>
                                </div>
                            </li>
                            <li class="cs-folder-item">
                                <span class="cs-folder-item-icon">📄</span>
                                <span class="cs-folder-item-name">レポート提出要項.docx</span>
                                <div class="cs-folder-item-actions">
                                    <button class="cs-folder-action-btn">📝</button>
                                    <button class="cs-folder-action-btn">🗑️</button>
                                </div>
                            </li>
                            <li class="cs-folder-item">
                                <span class="cs-folder-item-icon">📄</span>
                                <span class="cs-folder-item-name">参考文献リスト.xlsx</span>
                                <div class="cs-folder-item-actions">
                                    <button class="cs-folder-action-btn">📝</button>
                                    <button class="cs-folder-action-btn">🗑️</button>
                                </div>
                            </li>
                        </ul>
                    </div>
                    
                    <div class="cs-folder-section">
                        <div class="cs-folder-header">
                            <h4>個人メモ</h4>
                            <button class="cs-folder-add-btn">新規追加</button>
                        </div>
                        <ul class="cs-folder-list">
                            <li class="cs-folder-item">
                                <span class="cs-folder-item-icon">📝</span>
                                <span class="cs-folder-item-name">勉強計画.txt</span>
                                <div class="cs-folder-item-actions">
                                    <button class="cs-folder-action-btn">📝</button>
                                    <button class="cs-folder-action-btn">🗑️</button>
                                </div>
                            </li>
                            <li class="cs-folder-item">
                                <span class="cs-folder-item-icon">📝</span>
                                <span class="cs-folder-item-name">研究メモ.txt</span>
                                <div class="cs-folder-item-actions">
                                    <button class="cs-folder-action-btn">📝</button>
                                    <button class="cs-folder-action-btn">🗑️</button>
                                </div>
                            </li>
                        </ul>
                    </div>
                </div>
            `;
            showTabContent('カスタムフォルダ', content);
            
            // フォルダアクションのイベントリスナー
            setTimeout(() => {
                document.querySelectorAll('.cs-folder-add-btn').forEach(button => {
                    button.addEventListener('click', () => {
                        alert('新しいファイルを追加する機能はまだ実装中です');
                    });
                });
                
                document.querySelectorAll('.cs-folder-action-btn').forEach(button => {
                    button.addEventListener('click', () => {
                        alert('ファイル操作機能はまだ実装中です');
                    });
                });
            }, 100);
        }
    );

    // 掲示板タブ
    addCustomToolTab(
        '掲示板',
        'icon-sakai--sakai-forums cs-custom-icon',
        'カスタム掲示板(開発中)',
        () => {
            // 掲示板のコンテンツ
            const forumContainer = document.createElement('div');
            forumContainer.className = 'cs-tact-forum';

            const forumHeader = document.createElement('div');
            forumHeader.className = 'cs-forum-header';
            
            const forumTitle = document.createElement('h3');
            forumTitle.textContent = 'カスタム掲示板(開発中)';
            forumHeader.appendChild(forumTitle);
            
            const newPostButton = document.createElement('button');
            newPostButton.textContent = '新規投稿';
            newPostButton.className = 'cs-forum-new-post-btn';
            newPostButton.addEventListener('click', () => {
                alert('新規投稿機能は現在開発中です');
            });
            
            forumHeader.appendChild(newPostButton);
            forumContainer.appendChild(forumHeader);

            // 掲示板の説明
            const forumDescription = document.createElement('p');
            forumDescription.textContent = '学生同士の情報交換や質問のための掲示板です';
            forumContainer.appendChild(forumDescription);
            
            // カテゴリータブ
            const forumCategoryTabs = document.createElement('div');
            forumCategoryTabs.className = 'cs-forum-category-tabs';
            
            ['一般', '授業関連', '課題質問', 'キャンパスライフ'].forEach(category => {
                const tab = document.createElement('button');
                tab.className = category === '一般' ? 'cs-forum-category-tab active' : 'cs-forum-category-tab';
                tab.textContent = category;
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
                postMeta.innerHTML = `投稿者: ${post.author} | 日付: ${post.date} | 返信: ${post.replies}`;
                
                postHeader.appendChild(postTitle);
                postHeader.appendChild(postMeta);
                
                const postContent = document.createElement('p');
                postContent.className = 'cs-forum-post-content';
                postContent.textContent = post.content;
                
                const postActions = document.createElement('div');
                postActions.className = 'cs-forum-post-actions';
                
                const replyButton = document.createElement('button');
                replyButton.className = 'cs-forum-reply-btn';
                replyButton.textContent = '返信する';
                replyButton.addEventListener('click', () => {
                    alert('返信機能は現在開発中です');
                });
                
                postActions.appendChild(replyButton);
                
                postItem.appendChild(postHeader);
                postItem.appendChild(postContent);
                postItem.appendChild(postActions);
                
                postList.appendChild(postItem);
            });
            
            forumContainer.appendChild(postList);
            
            showTabContent('カスタム掲示板(開発中)', forumContainer);
        }
    );
};