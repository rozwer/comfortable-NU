import { TactApiClient } from './tact-api';
import JSZip from 'jszip';

export class FolderUI {
    private container: HTMLElement;
    private tactApiClient: TactApiClient;
    private isEditMode: boolean = false;

    constructor(container: HTMLElement) {
        this.container = container;
        this.tactApiClient = new TactApiClient();
        this.init();
    }

    private init() {
        this.render();
        // 初期化時に自動読み込み
        this.loadTactStructure();
    }

    private render() {
        this.container.innerHTML = `
            <div class="folder-ui">
                <div class="folder-content">
                    ${this.renderTactTreeContent()}
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
                <div class="tact-structure-container" id="tact-structure-container">
                    <p class="loading-message">🔄 TACT APIから構造を読み込み中...</p>
                </div>
            </div>
        `;
    }

    /**
     * TACT APIから講義構造を読み込み
     */
    private async loadTactStructure(): Promise<void> {
        const containerElement = this.container.querySelector('#tact-structure-container');
        if (!containerElement) return;

        // ローディング表示
        containerElement.innerHTML = '<p class="loading-message">🔄 TACT APIから構造を読み込み中...</p>';

        try {
            // 現在のサイトIDを取得
            const siteId = this.tactApiClient.getCurrentSiteId();
            if (!siteId) {
                throw new Error('サイトIDを取得できませんでした');
            }

            // ローカルストレージに保存されたデータがあるかチェック
            // （サイトIDを設定してからストレージを確認）
            let hasStoredData: boolean = false;
            try {
                // サイトIDを一時的に設定してストレージをチェック
                this.tactApiClient.setSiteId(siteId);
                const storedTree = this.tactApiClient.buildFileTreeFromStorage();
                hasStoredData = !!(storedTree.children && storedTree.children.length > 0);
            } catch (e) {
                hasStoredData = false;
            }

            // APIからデータを取得（ローカルデータがない場合、または強制更新の場合）
            const items = await this.tactApiClient.fetchSiteContent(siteId);
            
            // 統計情報を生成
            const statistics = this.tactApiClient.generateStatistics(items);
            
            // ストレージからツリー構造を構築（保存された名前変更を反映）
            const tree = this.tactApiClient.buildFileTreeFromStorage();
            const treeHTML = this.tactApiClient.renderTreeAsHTML(tree, this.isEditMode);

            // 結果を表示
            containerElement.innerHTML = `
                <div class="tact-structure-results">
                    <div class="tact-statistics">
                        <h4>📊 統計情報</h4>
                        <p>${statistics}</p>
                        <p>🔍 サイトID: ${siteId}</p>
                    </div>
                    <div class="tact-tree">
                        <h4>🌲 フォルダ構造</h4>
                        <div class="tree-display">${treeHTML || '<p>構造が見つかりませんでした</p>'}</div>
                    </div>
                    <div class="tact-raw-data" style="margin-top: 20px;">
                        <details>
                            <summary>📄 生データ (JSON)</summary>
                            <pre class="json-display">${JSON.stringify(items, null, 2)}</pre>
                        </details>
                    </div>
                </div>
            `;

            // フォルダのトグル機能を追加
            this.addFolderToggleListeners(containerElement);
            
            // ファイル名編集機能を追加
            this.addEditListeners(containerElement);
            
            // ダウンロード機能を追加
            this.addDownloadListeners(containerElement);
            
            // ドラッグ&ドロップ機能を追加（編集モードの状態に応じて有効/無効を切り替え）
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

    public destroy() {
        // イベントリスナーのクリーンアップなど
        this.container.innerHTML = '';
    }
}