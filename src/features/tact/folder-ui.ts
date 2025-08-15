/**
 * TACTフォルダ機能のUI管理
 * フォルダ表示・編集・操作のユーザーインターフェース
 */
import { TactApiClient } from './tact-api';

export class FolderUI {
    private container: HTMLElement;
    private tactApiClient: TactApiClient;
    private isEditMode: boolean = false;
    private activeTab: 'class-materials' | 'assignments' | 'announcements' = 'class-materials';
    private announcements: any[] = [];

    constructor(container: HTMLElement) {
        this.container = container;
        this.tactApiClient = new TactApiClient();
        this.init();
    }

    private init() {
        this.render();
        // ボタンのイベントリスナーを追加
        this.addRefreshButtonListener();
        // タブ切り替えのイベントリスナーを追加
        this.addTabSwitchListeners();
        // 初期化時にデフォルトタブのデータを読み込み
        this.loadActiveTabData();
        // 初期描画時に最終更新ラベルを更新
        this.updateLastUpdatedLabel();
    }

    private render() {
        this.container.innerHTML = `
            <div class="folder-ui">
                <div class="folder-tabs">
                    <button class="tab-button ${this.activeTab === 'class-materials' ? 'active' : ''}" data-tab="class-materials">
                        📚 授業資料
                    </button>
                    <button class="tab-button ${this.activeTab === 'assignments' ? 'active' : ''}" data-tab="assignments">
                        📝 課題
                    </button>
                    <button class="tab-button ${this.activeTab === 'announcements' ? 'active' : ''}" data-tab="announcements">
                        📢 お知らせ
                    </button>
                </div>
                <div class="folder-content">
                    ${this.renderActiveTabContent()}
                </div>
            </div>
        `;
    }


    /**
     * TACT構造表示タブの内容を生成
     */
    private renderTactTreeContent(): string {
        return `
            <div class="folder-section">
                <h3>TACT講義構造</h3>
                <div class="tact-controls">
                    <button id="refresh-tact-data" class="btn btn-primary">
                        🔄 再読み込み
                    </button>
                    <span class="refresh-info">最新のデータを取得します</span>
                    <span class="last-updated" id="folder-last-updated" style="margin-left: 8px; color: #666;">
                        最終更新: ー
                    </span>
                </div>
                <div class="tact-structure-container" id="tact-structure-container">
                    <p class="loading-message">🔄 TACT APIから構造を読み込み中...</p>
                </div>
            </div>
        `;
    }

    // キャッシュ有効期間（秒）
    private readonly CACHE_EXPIRE_SECONDS = 2 * 60 * 60; // 2時間

    /**
     * フォルダ構造データのキャッシュ有効期間（秒）
     */
    private readonly FOLDER_CACHE_EXPIRE_SECONDS = 2 * 60 * 60; // 2時間
    /**
     * 再読み込みボタン用のキャッシュ無視期間（秒）
     */
    private readonly FOLDER_FORCE_REFRESH_INTERVAL = 10 * 60; // 10分

    /**
     * TACT APIから講義構造を読み込み
     */
    private async loadTactStructure(forceRefresh: boolean = false): Promise<void> {
        const containerElement = this.container.querySelector('#tact-structure-container');
        if (!containerElement) return;

        containerElement.innerHTML = '<p class="loading-message">🔄 TACT APIから構造を読み込み中...</p>';

        try {
            const siteId = this.tactApiClient.getCurrentSiteId();
            if (!siteId) throw new Error('サイトIDを取得できませんでした');
            const cacheKey = `tact-structure-cache-${siteId}`;
            const cacheTimeKey = `tact-structure-cache-time-${siteId}`;
            let useCache = false;
            let tree: any = null;
            const cached = localStorage.getItem(cacheKey);
            const cachedTime = localStorage.getItem(cacheTimeKey);
            if (!forceRefresh && cached && cachedTime) {
                const elapsed = (Date.now() - parseInt(cachedTime, 10)) / 1000;
                if (elapsed < this.CACHE_EXPIRE_SECONDS) {
                    tree = JSON.parse(cached);
                    useCache = true;
                }
            }
            if (!useCache) {
                // API fetch & build tree
                this.tactApiClient.setSiteId(siteId);
                const items = await this.tactApiClient.fetchSiteContent(siteId);
                this.tactApiClient.generateStatistics(items);
                tree = this.tactApiClient.buildFileTreeFromStorage();
                localStorage.setItem(cacheKey, JSON.stringify(tree));
                localStorage.setItem(cacheTimeKey, Date.now().toString());
            }
            const treeHTML = this.tactApiClient.renderTreeAsHTML(tree, this.isEditMode);
            containerElement.innerHTML = `
                <div class="tact-structure-results">
                    <div class="tact-tree">
                        <h4>🌲 フォルダ構造</h4>
                        <div class="tree-display">${treeHTML || '<p>構造が見つかりませんでした</p>'}</div>
                    </div>
                    <div class="tact-raw-data" style="margin-top: 20px;"></div>
                </div>
            `;
            this.addFolderToggleListeners(containerElement);
            this.addEditListeners(containerElement);
            this.addDownloadListeners(containerElement);
            this.addMoveButtonListeners(containerElement);
        } catch (error) {
            console.error('TACT構造の読み込みに失敗:', error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            containerElement.innerHTML = `
                <div class="error-message">
                    <p>❌ エラーが発生しました: ${errorMessage}</p>
                    <p>💡 ログインしているか、正しい講義ページにいるかを確認してください</p>
                </div>
            `;
        }
    }

    /**
     * フォルダ構造データを取得（キャッシュ対応）
     * @param forceRefresh trueならキャッシュを無視してAPI取得
     * @param forceRefreshByButton trueなら「再読み込みボタン」からの強制リフレッシュ
     */
    private async loadFolderStructure(forceRefresh: boolean = false, forceRefreshByButton: boolean = false): Promise<void> {
        const containerElement = this.container.querySelector('#tact-structure-container');
        if (!containerElement) return;

        containerElement.innerHTML = '<p class="loading-message">🔄 フォルダ構造を読み込み中...</p>';

        try {
            const siteId = this.tactApiClient.getCurrentSiteId();
            if (!siteId) throw new Error('サイトIDを取得できませんでした');
            const cacheKey = `folder-structure-cache-${siteId}`;
            const cacheTimeKey = `folder-structure-cache-time-${siteId}`;
            let useCache = false;
            let tree: any = null;
            const cached = localStorage.getItem(cacheKey);
            const cachedTime = localStorage.getItem(cacheTimeKey);
            const now = Date.now();
            if (!forceRefresh && cached && cachedTime) {
                const elapsed = (now - parseInt(cachedTime, 10)) / 1000;
                // 再読み込みボタンからの場合は10分以内ならキャッシュを使う
                if (forceRefreshByButton) {
                    if (elapsed < this.FOLDER_FORCE_REFRESH_INTERVAL) {
                        tree = JSON.parse(cached);
                        useCache = true;
                        this.updateLastUpdatedLabelFromTimestamp(parseInt(cachedTime, 10));
                    }
                } else {
                    if (elapsed < this.FOLDER_CACHE_EXPIRE_SECONDS) {
                        tree = JSON.parse(cached);
                        useCache = true;
                        this.updateLastUpdatedLabelFromTimestamp(parseInt(cachedTime, 10));
                    }
                }
            }
            if (!useCache) {
                this.tactApiClient.setSiteId(siteId);
                const items = await this.tactApiClient.fetchSiteContent(siteId);
                this.tactApiClient.generateStatistics(items);
                tree = this.tactApiClient.buildFileTreeFromStorage();
                localStorage.setItem(cacheKey, JSON.stringify(tree));
                localStorage.setItem(cacheTimeKey, now.toString());
                this.updateLastUpdatedLabelFromTimestamp(now);
            }
            const treeHTML = this.tactApiClient.renderTreeAsHTML(tree, this.isEditMode);
            containerElement.innerHTML = `
                <div class="tact-structure-results">
                    <div class="tact-tree">
                        <h4>🌲 フォルダ構造</h4>
                        <div class="tree-display">${treeHTML || '<p>構造が見つかりませんでした</p>'}</div>
                    </div>
                    <div class="tact-raw-data" style="margin-top: 20px;"></div>
                </div>
            `;
            this.addFolderToggleListeners(containerElement);
            this.addEditListeners(containerElement);
            this.addDownloadListeners(containerElement);
            this.addMoveButtonListeners(containerElement);
        } catch (error) {
            console.error('フォルダ構造の読み込みに失敗:', error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            containerElement.innerHTML = `
                <div class="error-message">
                    <p>❌ エラーが発生しました: ${errorMessage}</p>
                    <p>💡 ログインしているか、正しい講義ページにいるかを確認してください</p>
                </div>
            `;
        }
    }

    /**
     * 最終更新ラベルを更新（localStorageの時刻から）
     */
    private updateLastUpdatedLabel(): void {
        try {
            const siteId = this.tactApiClient.getCurrentSiteId();
            if (!siteId) return;
            const cacheTimeKey = `folder-structure-cache-time-${siteId}`;
            const tsStr = localStorage.getItem(cacheTimeKey);
            if (tsStr) {
                const ts = parseInt(tsStr, 10);
                this.updateLastUpdatedLabelFromTimestamp(ts);
            }
        } catch {}
    }

    /**
     * 最終更新ラベルを特定のタイムスタンプで更新
     */
    private updateLastUpdatedLabelFromTimestamp(timestampMs: number): void {
        const label = this.container.querySelector('#folder-last-updated');
        if (!label) return;
        try {
            const d = new Date(timestampMs);
            const text = `最終更新: ${d.toLocaleString()}`;
            (label as HTMLElement).textContent = text;
        } catch {
            (label as HTMLElement).textContent = '最終更新: ー';
        }
    }

    /**
     * アクティブなタブのデータを読み込み
     */
    private loadActiveTabData(): void {
        switch (this.activeTab) {
            case 'class-materials':
                this.loadFolderStructure();
                break;
            case 'assignments':
                this.loadAssignments();
                break;
            case 'announcements':
                this.loadAnnouncements();
                break;
        }
    }

    /**
     * 再読み込みボタンのイベントリスナーを追加
     */
    private addRefreshButtonListener(): void {
        const refreshButton = this.container.querySelector('#refresh-tact-data') as HTMLButtonElement;
        if (refreshButton) {
            refreshButton.addEventListener('click', async () => {
                refreshButton.disabled = true;
                refreshButton.textContent = '🔄 実行中...';
                try {
                    if (this.activeTab === 'assignments') {
                        await this.fetchAndLogAssignmentsForCurrentSite();
                    } else {
                        await this.loadFolderStructure(false, true); // 再読み込みボタンからの呼び出し
                    }
                } catch (error) {
                    console.error('再読み込みエラー:', error);
                } finally {
                    refreshButton.disabled = false;
                    refreshButton.textContent = '🔄 再読み込み';
                    // 取得後に最終更新ラベルを同期
                    this.updateLastUpdatedLabel();
                }
            });
        }
    }

    /**
     * 現在開いている講義サイトの課題データを取得し返す
     */
    private async fetchAssignmentsForCurrentSite(): Promise<any[]> {
        try {
            const match = location.href.match("(https?://[^/]+)/portal");
            const baseURL = match ? match[1] : "";
            const courseIdMatch = location.href.match("/portal/site-?[a-z]*/([^/]+)");
            const courseId = courseIdMatch ? courseIdMatch[1] : null;
            if (!baseURL || !courseId) {
                console.warn("課題取得: サイトIDまたはベースURLが取得できませんでした");
                return [];
            }
            const url = `${baseURL}/direct/assignment/site/${courseId}.json?n=100`;
            const res = await fetch(url, { cache: "no-cache" });
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data.assignment_collection)) {
                    return data.assignment_collection;
                }
            } else {
                console.warn(`Failed to fetch assignments for ${courseId}: ${res.status}`);
            }
        } catch (e) {
            console.error("Error fetching assignments for current site:", e);
        }
        return [];
    }

    /**
     * 現在開いている講義サイトの課題データを取得しコンソールに出力
     */
    private async fetchAndLogAssignmentsForCurrentSite(): Promise<void> {
        try {
            // SakaiのベースURLを取得
            const match = location.href.match("(https?://[^/]+)/portal");
            const baseURL = match ? match[1] : "";
            // 現在の講義サイトIDを取得
            const courseIdMatch = location.href.match("/portal/site-?[a-z]*/([^/]+)");
            const courseId = courseIdMatch ? courseIdMatch[1] : null;
            if (!baseURL || !courseId) {
                console.warn("課題取得: サイトIDまたはベースURLが取得できませんでした");
                return;
            }
            const url = `${baseURL}/direct/assignment/site/${courseId}.json?n=100`;
            const res = await fetch(url, { cache: "no-cache" });
            if (res.ok) {
                const data = await res.json();
                console.log(`Course ID: ${courseId}`, data);
            } else {
                console.warn(`Failed to fetch assignments for ${courseId}: ${res.status}`);
            }
        } catch (e) {
            console.error("Error fetching assignments for current site:", e);
        }
    }

    /**
     * フォルダのトグル機能を追加
     */
    private addFolderToggleListeners(container: Element): void {
        const collapsibleFolders = container.querySelectorAll('.folder-item.collapsible');
        
        collapsibleFolders.forEach(folder => {
            const toggleIcon = folder.querySelector('.toggle-icon');
            const folderName = folder.querySelector('.folder-name');
            const children = folder.querySelector('.folder-children') as HTMLElement;
            
            if (toggleIcon && folderName && children) {
                const toggleFolder = () => {
                    const isCollapsed = children.style.display === 'none';
                    children.style.display = isCollapsed ? 'block' : 'none';
                    toggleIcon.textContent = isCollapsed ? '▼' : '▶';
                };
                
                // クリックイベントを追加
                [toggleIcon, folderName].forEach(element => {
                    element.addEventListener('click', toggleFolder);
                    (element as HTMLElement).style.cursor = 'pointer';
                });
            }
        });
    }

    /**
     * ファイル名編集機能を追加
     */
    private addEditListeners(container: Element): void {
        const editIcons = container.querySelectorAll('.edit-icon');
        
        editIcons.forEach(editIcon => {
            editIcon.addEventListener('click', (e) => {
                e.stopPropagation(); // イベントバブリングを防ぐ
                
                const editableElement = editIcon.parentElement?.querySelector('.editable-name');
                const nodeElement = editIcon.closest('[data-node-id]');
                
                if (editableElement && nodeElement) {
                    this.makeEditable(editableElement as HTMLElement, nodeElement as HTMLElement);
                }
            });
        });
    }

    /**
     * 要素を編集可能にする
     */
    private makeEditable(editableElement: HTMLElement, nodeElement: HTMLElement): void {
        const originalText = editableElement.textContent || '';
        const nodeId = nodeElement.getAttribute('data-node-id');
        
        // 入力フィールドを作成
        const input = document.createElement('input');
        input.type = 'text';
        input.value = originalText;
        input.className = 'edit-input';
        input.style.cssText = 'border: 1px solid #007acc; outline: none; background: white; padding: 2px;';
        
        // 確定処理
        const saveEdit = () => {
            const newName = input.value.trim();
            if (newName && newName !== originalText && nodeId) {
                // ファイル名を更新
                if (this.tactApiClient.renameItem(nodeId, newName)) {
                    editableElement.textContent = newName;
                    editableElement.setAttribute('data-original', newName);
                    
                    // ツリーを再構築して表示を更新
                    this.refreshTreeDisplay();
                } else {
                    alert('ファイル名の変更に失敗しました');
                }
            }
            
            // 入力フィールドを元に戻す
            editableElement.style.display = '';
            input.remove();
        };
        
        // キャンセル処理
        const cancelEdit = () => {
            editableElement.style.display = '';
            input.remove();
        };
        
        // イベントリスナー
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                saveEdit();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                cancelEdit();
            }
        });
        
        input.addEventListener('blur', saveEdit);
        
        // 要素を置き換え
        editableElement.style.display = 'none';
        editableElement.parentNode?.insertBefore(input, editableElement.nextSibling);
        
        // フォーカスして選択
        input.focus();
        input.select();
    }

    /**
     * ツリー表示を更新
     */
    private refreshTreeDisplay(): void {
        const containerElement = this.container.querySelector('#tact-structure-container');
        if (!containerElement) return;

        try {
            // ストレージからツリー構造を再構築
            const tree = this.tactApiClient.buildFileTreeFromStorage();
            const treeHTML = this.tactApiClient.renderTreeAsHTML(tree, this.isEditMode);

            // ツリー部分のみを更新
            const treeDisplayElement = containerElement.querySelector('.tree-display');
            if (treeDisplayElement) {
                treeDisplayElement.innerHTML = treeHTML || '<p>構造が見つかりませんでした</p>';
                
                // イベントリスナーを再設定
                this.addFolderToggleListeners(containerElement);
                this.addEditListeners(containerElement);
                this.addDownloadListeners(containerElement);
                
                // 編集モードの場合は移動ボタン機能を追加
                if (this.isEditMode) {
                    this.addMoveButtonListeners(containerElement);
                }
            }
        } catch (error) {
            console.error('ツリー表示の更新に失敗:', error);
        }
    }

    /**
     * ダウンロード機能を追加
     */
    private addDownloadListeners(container: Element): void {
        const downloadButton = container.querySelector('#download-selected') as HTMLButtonElement;
        const selectedCountSpan = container.querySelector('.selected-count') as HTMLSpanElement;
        const checkboxes = container.querySelectorAll('.file-checkbox') as NodeListOf<HTMLInputElement>;

        if (!downloadButton || !selectedCountSpan) return;

        // チェックボックスの選択状態を監視
        const updateSelectedCount = () => {
            const selectedCheckboxes = Array.from(checkboxes).filter(cb => cb.checked);
            const count = selectedCheckboxes.length;
            
            selectedCountSpan.textContent = `(${count}件選択)`;
            downloadButton.disabled = count === 0;
        };

        // 各チェックボックスにイベントリスナーを追加
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', updateSelectedCount);
        });

        // ダウンロードボタンのクリックイベント
        downloadButton.addEventListener('click', async () => {
            const selectedCheckboxes = Array.from(checkboxes).filter(cb => cb.checked);
            
            if (selectedCheckboxes.length === 0) {
                alert('ダウンロードするファイルを選択してください。');
                return;
            }

            try {
                downloadButton.disabled = true;
                downloadButton.textContent = 'ダウンロード中...';
                
                await this.downloadSelectedFiles(selectedCheckboxes);
                
                // ダウンロード完了後、チェックボックスをリセット
                selectedCheckboxes.forEach(cb => cb.checked = false);
                updateSelectedCount();
                
            } catch (error) {
                console.error('ダウンロードエラー:', error);
                alert('ダウンロード中にエラーが発生しました。');
            } finally {
                downloadButton.disabled = false;
                downloadButton.textContent = '選択したファイルをダウンロード';
            }
        });

        // 初期状態を設定
        updateSelectedCount();
    }

    /**
     * 選択されたファイルを個別にダウンロード
     */
    private async downloadSelectedFiles(checkboxes: HTMLInputElement[]): Promise<void> {
        const filesToDownload = checkboxes.map(cb => ({
            url: cb.getAttribute('data-url'),
            filename: cb.getAttribute('data-filename')
        })).filter(file => file.url && file.filename);

        if (filesToDownload.length === 0) {
            throw new Error('ダウンロード可能なファイルが見つかりません。');
        }

        // 各ファイルを個別にダウンロード
        let successCount = 0;
        let errorCount = 0;

        for (const file of filesToDownload) {
            try {
                if (file.url && file.filename) {
                    await this.downloadSingleFile(file.url, file.filename);
                    successCount++;
                    
                    // ダウンロード間隔を空ける（サーバーへの負荷軽減）
                    if (filesToDownload.length > 1) {
                        await new Promise(resolve => setTimeout(resolve, 500));
                    }
                }
            } catch (error) {
                console.error(`ファイル ${file.filename} のダウンロードに失敗:`, error);
                errorCount++;
            }
        }

        // 結果を通知
        if (errorCount > 0) {
            alert(`ダウンロード完了: ${successCount}件成功, ${errorCount}件失敗`);
        } else {
            // 成功時は控えめな通知（複数ファイルの場合のみ）
            if (filesToDownload.length > 1) {
                console.log(`${successCount}件のファイルのダウンロードが完了しました`);
            }
        }
    }

    /**
     * 単一ファイルをダウンロード
     */
    private async downloadSingleFile(url: string, filename: string): Promise<void> {
        try {
            // NUSS共有直リンクを先に判定
            if (this.isNussLink(url)) {
                await this.handleNussFile(url, filename);
                return;
            }

            const response = await fetch(url, {
                method: 'GET',
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error(`HTTP エラー: ${response.status}`);
            }

            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = filename;
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            window.URL.revokeObjectURL(downloadUrl);
        } catch (error) {
            console.error(`ファイル ${filename} のダウンロードに失敗:`, error);
            throw error;
        }
    }

    /**
     * NUSSリンクかどうか判定
     */
    private isNussLink(url: string): boolean {
        return url.includes('nuss.nagoy') || url.includes('https%3A__nuss.nagoy');
    }

    // NUSSの .URL 探索等の処理は行わない（従来どおり案内のみ）

    /**
     * NUSSファイルの警告表示とリンク開き
     */
    private async handleNussFile(url: string, filename: string): Promise<void> {
        console.log(`⚠️ NUSSファイル検出: ${filename}`);
        const message = `NUSSファイル「${filename}」は現在ダウンロードできません。\n\nブラウザの別タブでNUSSサイトを開きます。\n手動でダウンロードしてください。`;
        if (confirm(message)) {
            try { window.open(url, '_blank'); } catch {}
        } else {
            console.log('👤 ユーザーがNUSSリンクを開くのをキャンセルしました');
        }
    }

    /**
     * 編集モードのリスナーを追加
     */
    private addEditModeListeners(container: Element): void {
        const toggleButton = container.querySelector('#toggle-edit-mode') as HTMLButtonElement;
        
        if (toggleButton) {
            toggleButton.addEventListener('click', () => {
                this.toggleEditMode();
            });
        }
    }

    /**
     * 編集モードを切り替え
     */
    private toggleEditMode(): void {
        this.isEditMode = !this.isEditMode;
        console.log(`編集モード切り替え: ${this.isEditMode ? 'ON' : 'OFF'}`);
        
        // UIを再描画
        this.render();
        this.loadTactStructure();
    }

    /**
     * 移動ボタン機能を追加
     */
    private addMoveButtonListeners(container: Element): void {
        if (!this.isEditMode) return;

        const moveButtons = container.querySelectorAll('.move-btn');
        console.log(`移動ボタンリスナーを追加中... (編集モード: ${this.isEditMode})`);
        console.log(`移動ボタン数: ${moveButtons.length}`);
        
        moveButtons.forEach(button => {
            const btnElement = button as HTMLButtonElement;
            const itemId = btnElement.getAttribute('data-item-id');
            
            if (itemId) {
                console.log(`移動ボタンを設定: ${itemId}`);
                btnElement.addEventListener('click', (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    this.showMoveDestinationDialog(itemId);
                });
            }
        });
    }

    /**
     * 移動先選択ダイアログを表示
     */
    private showMoveDestinationDialog(itemId: string): void {
        // 現在の構造を取得
        const tree = this.tactApiClient.buildFileTreeFromStorage();
        if (!tree || !tree.children) return;

        // オーバーレイを作成
        const overlay = document.createElement('div');
        overlay.className = 'dialog-overlay';
        
        // ダイアログを作成
        const dialog = document.createElement('div');
        dialog.className = 'move-destination-dialog';
        
        // 移動するアイテムの名前を取得
        const itemName = this.getItemNameById(itemId);
        
        dialog.innerHTML = `
            <h3>「${itemName}」の移動先を選択</h3>
            <ul class="folder-list">
                <li class="folder-option root-folder" data-folder-id="root">
                    🏠 ルートフォルダ（最上位）
                </li>
                ${this.generateFolderOptions(tree.children, itemId)}
            </ul>
            <div class="dialog-buttons">
                <button class="btn btn-secondary" id="cancel-move">キャンセル</button>
                <button class="btn btn-primary" id="confirm-move" disabled>移動実行</button>
            </div>
        `;

        // ダイアログを画面に追加
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        let selectedFolderId: string | null = null;
        const confirmButton = dialog.querySelector('#confirm-move') as HTMLButtonElement;
        const cancelButton = dialog.querySelector('#cancel-move') as HTMLButtonElement;

        // フォルダ選択機能
        const folderOptions = dialog.querySelectorAll('.folder-option');
        folderOptions.forEach(option => {
            option.addEventListener('click', () => {
                // 他の選択を解除
                folderOptions.forEach(opt => opt.classList.remove('selected'));
                // 現在の選択をマーク
                option.classList.add('selected');
                
                selectedFolderId = option.getAttribute('data-folder-id');
                confirmButton.disabled = false;
                console.log(`移動先選択: ${selectedFolderId}`);
            });
        });

        // キャンセルボタン
        cancelButton.addEventListener('click', () => {
            document.body.removeChild(overlay);
        });

        // 確定ボタン
        confirmButton.addEventListener('click', () => {
            if (selectedFolderId) {
                if (selectedFolderId === 'root') {
                    this.moveItemToRoot(itemId);
                } else {
                    this.moveItemToFolder(itemId, selectedFolderId);
                }
            }
            document.body.removeChild(overlay);
        });

        // オーバーレイクリックでキャンセル
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                document.body.removeChild(overlay);
            }
        });

        // ESCキーでキャンセル
        document.addEventListener('keydown', function escHandler(e) {
            if (e.key === 'Escape') {
                if (document.body.contains(overlay)) {
                    document.body.removeChild(overlay);
                }
                document.removeEventListener('keydown', escHandler);
            }
        });
    }

    /**
     * アイテムIDから名前を取得
     */
    private getItemNameById(itemId: string): string {
        const tree = this.tactApiClient.buildFileTreeFromStorage();
        const findItem = (node: any): string | null => {
            if (node.nodeId === itemId) {
                return node.name;
            }
            if (node.children) {
                for (const child of node.children) {
                    const result = findItem(child);
                    if (result) return result;
                }
            }
            return null;
        };

        if (tree.children) {
            for (const child of tree.children) {
                const result = findItem(child);
                if (result) return result;
            }
        }
        return 'Unknown Item';
    }

    /**
     * フォルダ選択肢を再帰的に生成
     */
    private generateFolderOptions(nodes: any[], excludeItemId: string, level: number = 0): string {
        let html = '';
        const indent = '　'.repeat(level);
        
        nodes.forEach(node => {
            if (node.type === 'folder' && node.nodeId !== excludeItemId) {
                html += `<li class="folder-option" data-folder-id="${node.nodeId}">
                    ${indent}📂 ${node.name}
                </li>`;
                
                if (node.children && node.children.length > 0) {
                    html += this.generateFolderOptions(node.children, excludeItemId, level + 1);
                }
            }
        });
        
        return html;
    }

    /**
     * アイテムをフォルダに移動
     */
    private moveItemToFolder(itemId: string, folderId: string): void {
        console.log(`=== UI: フォルダへの移動開始 ===`);
        console.log(`アイテムID: ${itemId}, フォルダID: ${folderId}`);
        
        try {
            const success = this.tactApiClient.changeItemParent(itemId, folderId);
            console.log(`移動結果: ${success}`);
            
            if (success) {
                console.log(`アイテム ${itemId} をフォルダ ${folderId} に移動しました`);
                this.refreshTreeDisplay();
            } else {
                alert('ファイルの移動に失敗しました');
            }
        } catch (error) {
            console.error('ファイル移動エラー:', error);
            alert('ファイル移動中にエラーが発生しました');
        }
    }

    /**
     * アイテムをルートレベルに移動
     */
    private moveItemToRoot(itemId: string): void {
        console.log(`=== UI: ルートへの移動開始 ===`);
        console.log(`アイテムID: ${itemId}`);
        
        try {
            const success = this.tactApiClient.changeItemParent(itemId);
            console.log(`移動結果: ${success}`);
            
            if (success) {
                console.log(`アイテム ${itemId} をルートレベルに移動しました`);
                this.refreshTreeDisplay();
            } else {
                alert('ファイルの移動に失敗しました');
            }
        } catch (error) {
            console.error('ファイル移動エラー:', error);
            alert('ファイル移動中にエラーが発生しました');
        }
    }

    /**
     * アクティブなタブのコンテンツを返す
     */
    private renderActiveTabContent(): string {
        switch (this.activeTab) {
            case 'class-materials':
                return this.renderTactTreeContent();
            case 'assignments':
                return this.renderAssignmentsContent();
            case 'announcements':
                return this.renderAnnouncementsContent();
            default:
                return this.renderTactTreeContent();
        }
    }

    /**
     * 課題タブのコンテンツを表示
     */
    private renderAssignmentsContent(): string {
        return `
            <div class="tab-content assignments-content">
                <div class="folder-section">
                    <h3>📝 課題一覧</h3>
                    <div class="tact-controls">
                        <button id="refresh-tact-data" class="btn btn-primary">
                            🔄 再読み込み
                        </button>
                        <span class="refresh-info">最新の課題データを取得します</span>
                    </div>
                    <div class="assignment-controls">
                        <div class="sort-controls">
                            <label>📊 ソート:</label>
                            <select id="assignment-sort" class="sort-select">
                                <option value="name">名前順</option>
                                <option value="due-date">提出期限順</option>
                                <option value="open-date">公開日順</option>
                            </select>
                        </div>
                        <div class="filter-controls">
                            <label>
                                <input type="checkbox" id="show-unsubmitted-first" checked>
                                📌 未提出を上部に表示
                            </label>
                        </div>
                    </div>
                    <div class="assignments-container" id="assignments-container">
                        <p class="loading-message">🔄 課題データを読み込み中...</p>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * お知らせタブのコンテンツを表示
     */
    private renderAnnouncementsContent(): string {
        return `
            <div class="tab-content announcements-content">
                <div class="folder-section">
                    <h3>📢 お知らせ</h3>
                    <div class="tact-controls">
                        <button id="refresh-tact-data" class="btn btn-primary">
                            🔄 再読み込み
                        </button>
                        <span class="refresh-info">最新のお知らせを取得します</span>
                    </div>
                    <div class="announcements-container" id="announcements-container">
                        <p class="loading-message">🔄 お知らせを読み込み中...</p>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * タブ切り替えのイベントリスナーを追加
     */
    private addTabSwitchListeners(): void {
        const tabButtons = this.container.querySelectorAll('.tab-button');
        tabButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const target = e.target as HTMLElement;
                const tabType = target.getAttribute('data-tab') as 'class-materials' | 'assignments' | 'announcements';
                if (tabType && tabType !== this.activeTab) {
                    this.switchTab(tabType);
                }
            });
        });
    }

    /**
     * タブを切り替える
     */
    private switchTab(tabType: 'class-materials' | 'assignments' | 'announcements'): void {
        console.log(`タブ切り替え: ${this.activeTab} → ${tabType}`);
        this.activeTab = tabType;
        this.render();
        this.addRefreshButtonListener();
        this.addTabSwitchListeners();
        switch (tabType) {
            case 'class-materials':
                // 先に最終更新ラベルを即時反映（キャッシュ時刻があれば）
                this.updateLastUpdatedLabel();
                this.loadFolderStructure();
                break;
            case 'assignments':
                this.loadAssignments();
                break;
            case 'announcements':
                this.loadAnnouncements();
                break;
        }
    }

    /**
     * 課題データを読み込み
     */
    private async loadAssignments(): Promise<void> {
        const containerElement = this.container.querySelector('#assignments-container');
        if (!containerElement) return;

        containerElement.innerHTML = '<p class="loading-message">🔄 課題データを読み込み中...</p>';

        try {
            const match = location.href.match("(https?://[^/]+)/portal");
            const baseURL = match ? match[1] : "";
            const courseIdMatch = location.href.match("/portal/site-?[a-z]*/([^/]+)");
            const courseId = courseIdMatch ? courseIdMatch[1] : null;
            const cacheKey = `assignment-cache-${courseId}`;
            const cacheTimeKey = `assignment-cache-time-${courseId}`;
            let assignments: any[] = [];
            let useCache = false;
            if (courseId) {
                const cached = localStorage.getItem(cacheKey);
                const cachedTime = localStorage.getItem(cacheTimeKey);
                if (cached && cachedTime) {
                    const elapsed = (Date.now() - parseInt(cachedTime, 10)) / 1000;
                    if (elapsed < this.CACHE_EXPIRE_SECONDS) {
                        assignments = JSON.parse(cached);
                        useCache = true;
                    }
                }
            }
            if (!useCache && baseURL && courseId) {
                const url = `${baseURL}/direct/assignment/site/${courseId}.json?n=100`;
                const res = await fetch(url, { cache: "no-cache" });
                if (res.ok) {
                    const data = await res.json();
                    assignments = Array.isArray(data.assignment_collection) ? data.assignment_collection : [];
                    localStorage.setItem(cacheKey, JSON.stringify(assignments));
                    localStorage.setItem(cacheTimeKey, Date.now().toString());
                }
            }
            if (!assignments || assignments.length === 0) {
                containerElement.innerHTML = '<p class="info-message">課題が見つかりませんでした</p>';
                return;
            }
            
            // ソート・フィルタを適用して表示
            this.renderSortedAssignments(assignments, containerElement);
        } catch (error) {
            console.error('課題の読み込みに失敗:', error);
            containerElement.innerHTML = `
                <div class="error-message">
                    <p>❌ 課題の読み込みに失敗しました</p>
                </div>
            `;
        }
        this.addRefreshButtonListener();
    }

    /**
     * 自然順序ソート（数字を数値として比較）
     */
    private naturalSort(a: string, b: string): number {
        const regex = /(\d+|\D+)/g;
        const aParts = a.match(regex) || [];
        const bParts = b.match(regex) || [];
        
        const maxLength = Math.max(aParts.length, bParts.length);
        
        for (let i = 0; i < maxLength; i++) {
            const aPart = aParts[i] || '';
            const bPart = bParts[i] || '';
            
            // 両方が数字の場合は数値として比較
            if (/^\d+$/.test(aPart) && /^\d+$/.test(bPart)) {
                const aNum = parseInt(aPart, 10);
                const bNum = parseInt(bPart, 10);
                if (aNum !== bNum) {
                    return aNum - bNum;
                }
            } else {
                // 文字列として比較
                const result = aPart.localeCompare(bPart);
                if (result !== 0) {
                    return result;
                }
            }
        }
        
        return 0;
    }

    /**
     * 課題をソート・フィルタして表示
     */
    private renderSortedAssignments(assignments: any[], containerElement: Element): void {
        // ソート設定を取得
        const sortSelect = this.container.querySelector('#assignment-sort') as HTMLSelectElement;
        const sortType = sortSelect?.value || 'name';
        
        // フィルタ設定を取得
        const unsubmittedFirstCheckbox = this.container.querySelector('#show-unsubmitted-first') as HTMLInputElement;
        const showUnsubmittedFirst = unsubmittedFirstCheckbox?.checked ?? true;
        
        // ソート処理
        const sortedAssignments = [...assignments].sort((a, b) => {
            switch (sortType) {
                case 'due-date':
                    const dateA = a.dueTimeString ? new Date(a.dueTimeString).getTime() : Number.MAX_SAFE_INTEGER;
                    const dateB = b.dueTimeString ? new Date(b.dueTimeString).getTime() : Number.MAX_SAFE_INTEGER;
                    return dateA - dateB;
                case 'open-date':
                    const openA = a.openTimeString ? new Date(a.openTimeString).getTime() : 0;
                    const openB = b.openTimeString ? new Date(b.openTimeString).getTime() : 0;
                    return openB - openA; // 新しい順
                case 'name':
                default:
                    return this.naturalSort(a.title || '', b.title || '');
            }
        });
        
        // 未提出を上部に表示する処理
        const finalAssignments = showUnsubmittedFirst ? 
            [
                ...sortedAssignments.filter(a => !(a.submissions && a.submissions.length > 0)),
                ...sortedAssignments.filter(a => a.submissions && a.submissions.length > 0)
            ] : sortedAssignments;
            
        containerElement.innerHTML = `
            <div class="assignments-list">
                ${finalAssignments.map((a) => `
                    <div class="assignment-item clickable-card ${!(a.submissions && a.submissions.length > 0) ? 'unsubmitted' : ''}" data-assignment-id="${a.id}">
                        <h4>📝 ${a.title || '無題の課題'}</h4>
                        <p class="due-date">提出期限: ${a.dueTimeString ? a.dueTimeString.replace('T', ' ').replace('Z', '') : '未設定'}</p>
                        <div class="card-footer">
                            <span class="status-badge ${a.submissions && a.submissions.length > 0 ? 'status-submitted' : 'status-pending'}">
                                ${a.submissions && a.submissions.length > 0 ? '提出済み' : '未提出'}
                            </span>
                            <span class="click-hint">クリックで詳細表示</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        
        this.addAssignmentCardListeners(containerElement);
        this.addAssignmentControlListeners();
    }

    /**
     * 課題コントロールのイベントリスナーを追加
     */
    private addAssignmentControlListeners(): void {
        const sortSelect = this.container.querySelector('#assignment-sort') as HTMLSelectElement;
        const unsubmittedFirstCheckbox = this.container.querySelector('#show-unsubmitted-first') as HTMLInputElement;
        
        // ソート変更時の処理
        if (sortSelect) {
            sortSelect.addEventListener('change', () => {
                this.refreshAssignmentDisplay();
            });
        }
        
        // フィルタ変更時の処理
        if (unsubmittedFirstCheckbox) {
            unsubmittedFirstCheckbox.addEventListener('change', () => {
                this.refreshAssignmentDisplay();
            });
        }
    }

    /**
     * 課題表示を再描画
     */
    private async refreshAssignmentDisplay(): Promise<void> {
        const containerElement = this.container.querySelector('#assignments-container');
        if (!containerElement) return;
        
        // キャッシュされた課題データを取得
        const courseIdMatch = location.href.match("/portal/site-?[a-z]*/([^/]+)");
        const courseId = courseIdMatch ? courseIdMatch[1] : null;
        const cacheKey = `assignment-cache-${courseId}`;
        
        if (courseId) {
            const cached = localStorage.getItem(cacheKey);
            if (cached) {
                const assignments = JSON.parse(cached);
                this.renderSortedAssignments(assignments, containerElement);
                return;
            }
        }
        
        // キャッシュがない場合は再読み込み
        await this.loadAssignments();
    }

    /**
     * お知らせデータを読み込み
     */
    private async loadAnnouncements(): Promise<void> {
        const containerElement = this.container.querySelector('#announcements-container');
        if (!containerElement) return;

        containerElement.innerHTML = '<p class="loading-message">🔄 お知らせを読み込み中...</p>';

        try {
            const match = location.href.match("(https?://[^/]+)/portal");
            const baseURL = match ? match[1] : "";
            const courseIdMatch = location.href.match("/portal/site-?[a-z]*/([^/]+)");
            const courseId = courseIdMatch ? courseIdMatch[1] : null;
            const cacheKey = `announcement-cache-${courseId}`;
            const cacheTimeKey = `announcement-cache-time-${courseId}`;
            let announcements: any[] = [];
            let useCache = false;
            if (courseId) {
                const cached = localStorage.getItem(cacheKey);
                const cachedTime = localStorage.getItem(cacheTimeKey);
                if (cached && cachedTime) {
                    const elapsed = (Date.now() - parseInt(cachedTime, 10)) / 1000;
                    if (elapsed < this.CACHE_EXPIRE_SECONDS) {
                        announcements = JSON.parse(cached);
                        useCache = true;
                    }
                }
            }
            if (!useCache && baseURL && courseId) {
                const url = `${baseURL}/direct/announcement/site/${courseId}.json?n=100`;
                const res = await fetch(url, { cache: "no-cache" });
                if (res.ok) {
                    const data = await res.json();
                    announcements = Array.isArray(data.announcement_collection) ? data.announcement_collection : [];
                    localStorage.setItem(cacheKey, JSON.stringify(announcements));
                    localStorage.setItem(cacheTimeKey, Date.now().toString());
                }
            }
            this.announcements = announcements;
            if (!announcements || announcements.length === 0) {
                containerElement.innerHTML = '<p class="info-message">お知らせはありません</p>';
                return;
            }
            containerElement.innerHTML = `
                <div class="announcements-list">
                    ${(announcements as any[]).map((a: any) => `
                        <div class="announcement-item clickable-card" data-announcement-id="${a.announcementId}">
                            <h4>📢 ${a.title || '無題のお知らせ'}</h4>
                            <p class="date">${a.createdOn ? (new Date(a.createdOn)).toLocaleString() : ''}</p>
                            <p class="content">${a.body ? a.body.replace(/<[^>]+>/g, '').slice(0, 60) : ''}</p>
                            <div class="card-footer">
                                <span class="click-hint">クリックで詳細表示</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
            this.addAnnouncementCardListeners(containerElement);
        } catch (error) {
            console.error('お知らせの読み込みに失敗:', error);
            containerElement.innerHTML = `
                <div class="error-message">
                    <p>❌ お知らせの読み込みに失敗しました</p>
                </div>
            `;
        }
    }

    /**
     * 課題カードのクリックイベントリスナーを追加
     */
    private addAssignmentCardListeners(container: Element): void {
        const assignmentCards = container.querySelectorAll('.assignment-item.clickable-card');
        
        assignmentCards.forEach(card => {
            card.addEventListener('click', async (e) => {
                const assignmentId = card.getAttribute('data-assignment-id');
                if (assignmentId) {
                    await this.toggleAssignmentDetail(card as HTMLElement, assignmentId);
                }
            });
        });
    }

    /**
     * お知らせカードのクリックイベントリスナーを追加
     */
    private addAnnouncementCardListeners(container: Element): void {
        const announcementCards = container.querySelectorAll('.announcement-item.clickable-card');
        
        announcementCards.forEach(card => {
            card.addEventListener('click', (e) => {
                const announcementId = card.getAttribute('data-announcement-id');
                if (announcementId) {
                    this.toggleAnnouncementDetail(card as HTMLElement, announcementId);
                }
            });
        });
    }

    /**
     * 課題詳細モーダルを表示
     */
    private async showAssignmentDetailModal(assignmentId: string): Promise<void> {
        // キャッシュから課題詳細を取得、なければAPIから取得
        const assignmentData = await this.getAssignmentDetail(assignmentId);
        
        const overlay = document.createElement('div');
        overlay.className = 'dialog-overlay';
        
        const modal = document.createElement('div');
        modal.className = 'assignment-detail-modal';
        
        modal.innerHTML = `
            <div class="modal-header">
                <h3>📝 ${assignmentData.title}</h3>
                <button class="close-btn" id="close-assignment-modal">×</button>
            </div>
            <div class="modal-content">
                <div class="assignment-meta">
                    <div class="meta-item">
                        <strong>提出期限:</strong> ${assignmentData.dueDate}
                    </div>
                    <div class="meta-item">
                        <strong>状態:</strong> 
                        <span class="status-badge ${assignmentData.status === '提出済み' ? 'status-submitted' : 'status-pending'}">
                            ${assignmentData.status}
                        </span>
                    </div>
                    <div class="meta-item">
                        <strong>遅延提出:</strong> ${assignmentData.lateSubmission ? '可' : '不可'}
                    </div>
                    <div class="meta-item">
                        <strong>再提出:</strong> ${assignmentData.resubmission.allowed ? `可 (${assignmentData.resubmission.maxCount}回まで)` : '不可'}
                    </div>
                </div>
                
                <div class="assignment-description">
                    <h4>課題説明</h4>
                    <div class="description-content">
                        ${assignmentData.description}
                    </div>
                </div>
                
                <div class="assignment-attachments">
                    <h4>添付ファイル・リンク</h4>
                    <div class="attachments-list">
                        ${assignmentData.attachments.map((attachment: any) => `
                            <div class="attachment-item">
                                <span class="attachment-icon">${attachment.type === 'file' ? '📄' : '🔗'}</span>
                                <a href="${attachment.url}" target="_blank" class="attachment-link">
                                    ${attachment.name}
                                </a>
                                ${attachment.type === 'file' ? `<span class="file-size">(${attachment.size})</span>` : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" id="close-assignment-modal-footer">閉じる</button>
            </div>
        `;
        
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        
        // モーダルを閉じる処理
        const closeModal = () => {
            document.body.removeChild(overlay);
        };
        
        const closeButtons = [
            modal.querySelector('#close-assignment-modal'),
            modal.querySelector('#close-assignment-modal-footer')
        ];
        
        closeButtons.forEach(button => {
            if (button) {
                button.addEventListener('click', closeModal);
            }
        });
        
        // オーバーレイクリックで閉じる
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                closeModal();
            }
        });
        
        // ESCキーで閉じる
        document.addEventListener('keydown', function escHandler(e) {
            if (e.key === 'Escape') {
                closeModal();
                document.removeEventListener('keydown', escHandler);
            }
        });
    }

    /**
     * お知らせ詳細モーダルを表示
     */
    private showAnnouncementDetailModal(announcementId: string): void {
        // TODO: 実際のAPIからお知らせ詳細を取得
        const announcementData = this.getMockAnnouncementData(announcementId);
        
        const overlay = document.createElement('div');
        overlay.className = 'dialog-overlay';
        
        const modal = document.createElement('div');
        modal.className = 'announcement-detail-modal';
        
        modal.innerHTML = `
            <div class="modal-header">
                <h3>📢 ${announcementData.title}</h3>
                <button class="close-btn" id="close-announcement-modal">×</button>
            </div>
            <div class="modal-content">
                <div class="announcement-meta">
                    <div class="meta-row">
                        <div class="meta-item">
                            <strong>投稿日:</strong> ${announcementData.date}
                        </div>
                        <div class="meta-item">
                            <strong>投稿者:</strong> ${announcementData.author}
                        </div>
                    </div>
                </div>
                
                <div class="announcement-content">
                    <h4>お知らせ内容</h4>
                    <div class="content-body">
                        ${announcementData.content}
                    </div>
                </div>
                
                ${announcementData.attachments && announcementData.attachments.length > 0 ? `
                    <div class="announcement-attachments">
                        <h4>添付ファイル</h4>
                        <div class="attachments-list">
                            ${announcementData.attachments.map((attachment: any) => `
                                <div class="attachment-item">
                                    <span class="attachment-icon">📄</span>
                                    <a href="${attachment.url}" target="_blank" class="attachment-link">
                                        ${attachment.name}
                                    </a>
                                    <span class="file-size">(${attachment.size})</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" id="close-announcement-modal-footer">閉じる</button>
            </div>
        `;
        
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        
        // モーダルを閉じる処理
        const closeModal = () => {
            document.body.removeChild(overlay);
        };
        
        const closeButtons = [
            modal.querySelector('#close-announcement-modal'),
            modal.querySelector('#close-announcement-modal-footer')
        ];
        
        closeButtons.forEach(button => {
            if (button) {
                button.addEventListener('click', closeModal);
            }
        });
        
        // オーバーレイクリックで閉じる
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                closeModal();
            }
        });
        
        // ESCキーで閉じる
        document.addEventListener('keydown', function escHandler(e) {
            if (e.key === 'Escape') {
                closeModal();
                document.removeEventListener('keydown', escHandler);
            }
        });
    }

    /**
     * 課題詳細の表示/非表示を切り替え
     */
    private async toggleAssignmentDetail(cardElement: HTMLElement, assignmentId: string): Promise<void> {
        // 既存の詳細表示を確認
        const existingDetail = cardElement.nextElementSibling;
        if (existingDetail && existingDetail.classList.contains('assignment-detail-expanded')) {
            existingDetail.remove();
            cardElement.classList.remove('expanded');
            return;
        }
        // 他の展開されている詳細をすべて閉じる
        const allExpandedDetails = cardElement.parentElement?.querySelectorAll('.assignment-detail-expanded');
        const allExpandedCards = cardElement.parentElement?.querySelectorAll('.assignment-item.expanded');
        allExpandedDetails?.forEach(detail => detail.remove());
        allExpandedCards?.forEach(card => card.classList.remove('expanded'));

        // キャッシュ優先で課題詳細を取得
        const assignmentData = await this.getAssignmentDetail(assignmentId);
        // データがなければデフォルト
        const title = assignmentData?.title || '課題情報';
        const dueDate = assignmentData?.dueTimeString ? assignmentData.dueTimeString.replace('T', ' ').replace('Z', '') : '未設定';
        const status = assignmentData?.submissions && assignmentData.submissions.length > 0 ? '提出済み' : '未提出';
        const lateSubmission = assignmentData?.allowResubmission ? '可' : '不可';
        const resubmission = assignmentData?.allowResubmission ? '可' : '不可';
        const description = assignmentData?.instructions ? this.linkifyText(assignmentData.instructions.replace(/<[^>]+>/g, '')) : '詳細情報を取得できませんでした。';
        const attachments = Array.isArray(assignmentData?.attachments) ? assignmentData.attachments : [];

        // 詳細表示エリアを作成
        const detailElement = document.createElement('div');
        detailElement.className = 'assignment-detail-expanded';
        detailElement.innerHTML = `
            <div class="detail-content">
                <div class="assignment-meta">
                    <div class="meta-row">
                        <div class="meta-item">
                            <strong>提出期限:</strong> ${dueDate}
                        </div>
                        <div class="meta-item">
                            <strong>状態:</strong> 
                            <span class="status-badge ${status === '提出済み' ? 'status-submitted' : 'status-pending'}">
                                ${status}
                            </span>
                        </div>
                    </div>
                    <div class="meta-row">
                        <div class="meta-item">
                            <strong>遅延提出:</strong> ${lateSubmission}
                        </div>
                        <div class="meta-item">
                            <strong>再提出:</strong> ${resubmission}
                        </div>
                    </div>
                </div>
                <div class="assignment-description">
                    <h4>📝 課題説明</h4>
                    <div class="description-content">
                        ${description}
                    </div>
                </div>
                <div class="assignment-attachments">
                    <h4>📎 添付ファイル・リンク</h4>
                    ${attachments.length > 0 ? `
                        <div class="download-controls">
                            <button class="download-btn" id="download-selected-assignment-${assignmentId}" disabled>
                                選択したファイルをダウンロード
                            </button>
                            <span class="selected-count">(0件選択)</span>
                        </div>
                    ` : ''}
                    <div class="attachments-list">
                        ${attachments.length > 0 ? attachments.map((attachment: any, index: number) => `
                            <div class="attachment-item">
                                <input type="checkbox" class="attachment-checkbox" 
                                       id="attachment-${assignmentId}-${index}" 
                                       data-url="${attachment.url}" 
                                       data-filename="${attachment.name}">
                                <span class="attachment-icon">📄</span>
                                <a href="${attachment.url}" target="_blank" class="attachment-link">
                                    ${attachment.name}
                                </a>
                                <span class="file-size">(${attachment.size || ''})</span>
                                ${this.isNussLink(attachment.url) ? '<span class="nuss-label" style="color: #28a745; font-weight: bold; margin-left: 8px;">nuss</span>' : ''}
                            </div>
                        `).join('') : '<span>添付なし</span>'}
                    </div>
                </div>
                <div class="detail-actions">
                    <button class="btn btn-secondary collapse-btn">
                        ▲ 詳細を閉じる
                    </button>
                </div>
            </div>
        `;
        // カードの後に詳細を挿入
        cardElement.parentNode?.insertBefore(detailElement, cardElement.nextSibling);
        cardElement.classList.add('expanded');
        // 閉じるボタンのイベントリスナー
        const collapseBtn = detailElement.querySelector('.collapse-btn');
        if (collapseBtn) {
            collapseBtn.addEventListener('click', () => {
                detailElement.remove();
                cardElement.classList.remove('expanded');
            });
        }
        
        // 添付ファイルのダウンロード機能を追加
        this.addAssignmentAttachmentListeners(detailElement, assignmentId);
        
        // スムーズにスクロール
        setTimeout(() => {
            detailElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 100);
    }

    /**
     * お知らせ詳細の表示/非表示を切り替え
     */
    private toggleAnnouncementDetail(cardElement: HTMLElement, announcementId: string): void {
        // 既存の詳細表示を確認
        const existingDetail = cardElement.nextElementSibling;
        if (existingDetail && existingDetail.classList.contains('announcement-detail-expanded')) {
            existingDetail.remove();
            cardElement.classList.remove('expanded');
            return;
        }
        // 他の展開されている詳細をすべて閉じる
        const allExpandedDetails = cardElement.parentElement?.querySelectorAll('.announcement-detail-expanded');
        const allExpandedCards = cardElement.parentElement?.querySelectorAll('.announcement-item.expanded');
        allExpandedDetails?.forEach(detail => detail.remove());
        allExpandedCards?.forEach(card => card.classList.remove('expanded'));

        // API取得済みデータから該当お知らせを検索
        const announcementData = this.announcements.find((a: any) => a.announcementId === announcementId);
        if (!announcementData) {
            // データがなければエラー表示
            const detailElement = document.createElement('div');
            detailElement.className = 'announcement-detail-expanded';
            detailElement.innerHTML = `<div class="detail-content"><p>詳細情報を取得できませんでした。</p></div>`;
            cardElement.parentNode?.insertBefore(detailElement, cardElement.nextSibling);
            cardElement.classList.add('expanded');
            return;
        }
        // 詳細表示エリアを作成
        const detailElement = document.createElement('div');
        detailElement.className = 'announcement-detail-expanded';
        detailElement.innerHTML = `
            <div class="detail-content">
                <div class="announcement-meta">
                    <div class="meta-row">
                        <div class="meta-item">
                            <strong>投稿日:</strong> ${announcementData.createdOn ? (new Date(announcementData.createdOn)).toLocaleString() : '未設定'}
                        </div>
                        <div class="meta-item">
                            <strong>投稿者:</strong> ${announcementData.createdByDisplayName || '不明'}
                        </div>
                    </div>
                </div>
                <div class="announcement-content">
                    <h4>📢 お知らせ内容</h4>
                    <div class="content-body">
                        ${announcementData.body || ''}
                    </div>
                </div>
                ${(announcementData.attachments && announcementData.attachments.length > 0) ? `
                    <div class="announcement-attachments">
                        <h4>📎 添付ファイル</h4>
                        <div class="attachments-list">
                            ${announcementData.attachments.map((attachment: any) => `
                                <div class="attachment-item">
                                    <span class="attachment-icon">📄</span>
                                    <a href="${attachment.url}" target="_blank" class="attachment-link">
                                        ${attachment.name}
                                    </a>
                                    ${attachment.size ? `<span class="file-size">(${attachment.size})</span>` : ''}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
                <div class="detail-actions">
                    <button class="btn btn-secondary collapse-btn">
                        ▲ 詳細を閉じる
                    </button>
                </div>
            </div>
        `;
        // カードの後に詳細を挿入
        cardElement.parentNode?.insertBefore(detailElement, cardElement.nextSibling);
        cardElement.classList.add('expanded');

        // 閉じるボタンのイベントリスナー
        const collapseBtn = detailElement.querySelector('.collapse-btn');
        if (collapseBtn) {
            collapseBtn.addEventListener('click', () => {
                detailElement.remove();
                cardElement.classList.remove('expanded');
            });
        }

        // スムーズにスクロール
        setTimeout(() => {
            detailElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 100);
    }

    /**
     * 課題添付ファイルのダウンロード機能を追加
     */
    private addAssignmentAttachmentListeners(container: Element, assignmentId: string): void {
        const downloadButton = container.querySelector(`#download-selected-assignment-${assignmentId}`) as HTMLButtonElement;
        const selectedCountSpan = container.querySelector('.selected-count') as HTMLSpanElement;
        const checkboxes = container.querySelectorAll('.attachment-checkbox') as NodeListOf<HTMLInputElement>;
        
        if (!downloadButton || !selectedCountSpan) return;
        
        // チェックボックスの状態管理
        const updateDownloadButton = () => {
            const checkedBoxes = Array.from(checkboxes).filter(cb => cb.checked);
            const count = checkedBoxes.length;
            selectedCountSpan.textContent = `(${count}件選択)`;
            downloadButton.disabled = count === 0;
        };
        
        // チェックボックスのイベントリスナー
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', updateDownloadButton);
        });
        
        // ダウンロードボタンのイベントリスナー
        downloadButton.addEventListener('click', async () => {
            const selectedCheckboxes = Array.from(checkboxes).filter(cb => cb.checked);
            if (selectedCheckboxes.length === 0) return;
            
            try {
                downloadButton.disabled = true;
                downloadButton.textContent = 'ダウンロード中...';
                
                await this.downloadSelectedAttachments(selectedCheckboxes);
                
                // チェックボックスをリセット
                selectedCheckboxes.forEach(cb => cb.checked = false);
                updateDownloadButton();
            } catch (error) {
                console.error('添付ファイルダウンロードエラー:', error);
                alert('添付ファイルのダウンロードに失敗しました');
            } finally {
                downloadButton.disabled = false;
                downloadButton.textContent = '選択したファイルをダウンロード';
            }
        });
        
        // 初期状態を設定
        updateDownloadButton();
    }

    /**
     * 選択された添付ファイルをダウンロード
     */
    private async downloadSelectedAttachments(checkboxes: HTMLInputElement[]): Promise<void> {
        const attachments = checkboxes.map(checkbox => ({
            url: checkbox.getAttribute('data-url') || '',
            filename: checkbox.getAttribute('data-filename') || 'unknown'
        }));
        
        console.log(`📥 ${attachments.length}個の添付ファイルのダウンロードを開始`);
        
        for (const attachment of attachments) {
            if (attachment.url && attachment.filename) {
                try {
                    await this.downloadSingleFile(attachment.url, attachment.filename);
                    console.log(`✅ ダウンロード完了: ${attachment.filename}`);
                } catch (error) {
                    console.error(`❌ ダウンロード失敗: ${attachment.filename}`, error);
                }
            }
        }
        
        console.log(`🎉 添付ファイルのダウンロード処理完了`);
    }

    /**
     * 課題詳細を取得（キャッシュ優先）
     */
    private async getAssignmentDetail(assignmentId: string): Promise<any> {
        const cacheKey = `assignment-detail-${assignmentId}`;
        const cacheTimeKey = `assignment-detail-time-${assignmentId}`;
        
        // キャッシュチェック
        const cached = localStorage.getItem(cacheKey);
        const cachedTime = localStorage.getItem(cacheTimeKey);
        
        if (cached && cachedTime) {
            const elapsed = (Date.now() - parseInt(cachedTime, 10)) / 1000;
            if (elapsed < this.CACHE_EXPIRE_SECONDS) {
                console.log(`📋 課題詳細をキャッシュから取得: ${assignmentId}`);
                return JSON.parse(cached);
            }
        }
        
        // APIから取得を試行
        try {
            const match = location.href.match("(https?://[^/]+)/portal");
            const baseURL = match ? match[1] : "";
            
            if (baseURL) {
                const url = `${baseURL}/direct/assignment/${assignmentId}.json`;
                console.log(`🌐 課題詳細をAPIから取得: ${url}`);
                
                const response = await fetch(url, { 
                    cache: "no-cache",
                    credentials: 'include'
                });
                
                if (response.ok) {
                    const data = await response.json();
                    
                    // キャッシュに保存
                    localStorage.setItem(cacheKey, JSON.stringify(data));
                    localStorage.setItem(cacheTimeKey, Date.now().toString());
                    
                    console.log(`✅ 課題詳細をAPIから取得完了: ${assignmentId}`);
                    return data;
                }
            }
        } catch (error) {
            console.warn(`⚠️ 課題詳細APIエラー (${assignmentId}):`, error);
        }
        
        // フォールバック: モックデータを使用
        console.log(`🔄 モックデータにフォールバック: ${assignmentId}`);
        return this.getMockAssignmentData(assignmentId);
    }

    /**
     * モック課題データを取得
     */
    private getMockAssignmentData(assignmentId: string): any {
        const mockData: { [key: string]: any } = {
            'assignment-1': {
                title: 'レポート提出',
                dueDate: '2025年6月15日 23:59',
                status: '未提出',
                lateSubmission: true,
                resubmission: {
                    allowed: true,
                    maxCount: 3
                },
                description: `
                    <p>この課題では、授業で学習した内容について2000字以内のレポートを作成してください。</p>
                    <p><strong>提出要件:</strong></p>
                    <ul>
                        <li>文字数: 1500〜2000字</li>
                        <li>形式: PDF形式</li>
                        <li>参考文献を明記すること</li>
                        <li>剽窃チェックを実施します</li>
                    </ul>
                    <p><strong>評価基準:</strong></p>
                    <ul>
                        <li>内容の理解度 (40%)</li>
                        <li>論理的構成 (30%)</li>
                        <li>文章表現 (20%)</li>
                        <li>独創性 (10%)</li>
                    </ul>
                `,
                attachments: [
                    {
                        type: 'file',
                        name: '課題説明資料.pdf',
                        url: '#',
                        size: '1.2MB'
                    },
                    {
                        type: 'link',
                        name: '参考資料サイト',
                        url: '#'
                    }
                ]
            },
            'assignment-2': {
                title: '小テスト',
                dueDate: '2025年6月20日 15:00',
                status: '提出済み',
                lateSubmission: false,
                resubmission: {
                    allowed: false,
                    maxCount: 0
                },
                description: `
                    <p>第1〜3回の授業内容に関する小テストです。</p>
                    <p><strong>出題範囲:</strong></p>
                    <ul>
                        <li>第1回: 基礎概念</li>
                        <li>第2回: 応用理論</li>
                        <li>第3回: 実践演習</li>
                    </ul>
                    <p><strong>注意事項:</strong></p>
                    <ul>
                        <li>制限時間: 30分</li>
                        <li>回答後の修正は不可</li>
                        <li>一度開始したら中断できません</li>
                    </ul>
                `,
                attachments: [
                    {
                        type: 'link',
                        name: 'オンラインテスト（Webclass）',
                        url: '#'
                    }
                ]
            }
        };
        
        return mockData[assignmentId] || {
            title: '課題情報',
            dueDate: '未設定',
            status: '不明',
            lateSubmission: false,
            resubmission: { allowed: false, maxCount: 0 },
            description: '詳細情報を取得できませんでした。',
            attachments: []
        };
    }

    /**
     * モックお知らせデータを取得
     */
    private getMockAnnouncementData(announcementId: string): any {
        const mockData: { [key: string]: any } = {
            'announce-1': {
                title: '重要なお知らせ',
                date: '2025年6月5日 10:30',
                author: '田中教授',
                content: `
                    <p>お疲れ様です。</p>
                    <p>来週6月12日（木）の授業についてお知らせします。</p>
                    <p><strong>変更内容:</strong></p>
                    <ul>
                        <li>6月12日の授業は休講となります</li>
                        <li>補講日: 6月26日（木）同時間</li>
                        <li>場所: 通常と同じ教室</li>
                    </ul>
                    <p><strong>理由:</strong><br>
                    学会出張のため、誠に申し訳ございませんが休講とさせていただきます。</p>
                    <p>ご不明な点がございましたら、メールでお問い合わせください。</p>
                    <p>よろしくお願いいたします。</p>
                `,
                attachments: []
            },
            'announce-2': {
                title: '試験日程について',
                date: '2025年6月3日 14:15',
                author: '田中教授',
                content: `
                    <p>期末試験の日程が確定しましたのでお知らせします。</p>
                    
                    <p><strong>試験日程:</strong></p>
                    <ul>
                        <li>日時: 7月18日（金） 13:00〜14:30</li>
                        <li>場所: A棠201教室</li>
                        <li>試験時間: 90分</li>
                        <li>持込: 不可（電卓含む）</li>
                    </ul>
                    
                    <p><strong>出題範囲:</strong></p>
                    <ul>
                        <li>第1回〜第15回の授業内容</li>
                        <li>配布資料すべて</li>
                        <li>指定教科書 第1章〜第8章</li>
                    </ul>
                    
                    <p><strong>注意事項:</strong></p>
                    <ul>
                        <li>学生証を必ず持参してください</li>
                        <li>遅刻は30分まで入室可能</li>
                        <li>体調不良等で受験できない場合は事前に連絡すること</li>
                    </ul>
                    
                    <p>詳細な試験要項は添付ファイルをご確認ください。</p>
                `,
                attachments: [
                    {
                        name: '期末試験要項.pdf',
                        url: '#',
                        size: '256KB'
                    }
                ]
            }
        };
        
        return mockData[announcementId] || {
            title: 'お知らせ',
            date: '未設定',
            author: '不明',
            content: '詳細情報を取得できませんでした。',
            attachments: []
        };
    }

    /**
     * テキスト内のURLを自動検出し、aタグでリンク化する
     */
    private linkifyText(text: string): string {
        if (!text) return '';
        // URL検出用正規表現
        const urlRegex = /(https?:\/\/[\w\-._~:/?#[\]@!$&'()*+,;=%]+)(?![^<]*>|[^<>]*<\/?a)/g;
        // 既存のaタグ内は除外し、URLをaタグに変換
        return text.replace(urlRegex, (url) => {
            return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
        });
    }

    public destroy() {
        // イベントリスナーのクリーンアップなど
        this.container.innerHTML = '';
    }
}
