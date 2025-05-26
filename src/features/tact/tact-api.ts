/**
 * TACT API integration for content structure analysis
 */
import { FileStorage, FileSystemNode } from './file-storage';

export interface TactContentItem {
    title: string;
    type: string;
    container: string;
    url?: string;
    numChildren?: number;
    name?: string;
}

export interface FolderTreeNode {
    name: string;
    type: 'folder' | 'file';
    children?: FolderTreeNode[];
    url?: string;
    numChildren?: number;
    isContainer?: boolean;
    nodeId?: string; // ストレージのノードIDを保持
}

/**
 * TACT APIから講義コンテンツを取得
 */
export class TactApiClient {
    private static readonly BASE_URL = 'https://tact.ac.thers.ac.jp';
    private fileStorage: FileStorage;

    constructor() {
        this.fileStorage = new FileStorage();
        // 初期化時はストレージは読み込まない（サイトIDが設定されてから読み込む）
    }

    /**
     * 指定されたサイトIDのコンテンツを取得してストレージに保存
     */
    async fetchSiteContent(siteId: string): Promise<TactContentItem[]> {
        try {
            // サイトIDを設定（これによりサイト固有のストレージが読み込まれる）
            this.fileStorage.setSiteId(siteId);
            
            const response = await fetch(`${TactApiClient.BASE_URL}/direct/content/site/${siteId}.json`, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error ${response.status}`);
            }

            const data = await response.json();
            const items = data.content_collection || [];
            
            // APIデータをFileSystemNodeに変換してストレージに保存
            const nodes = items.map((item: any) => this.fileStorage.createNodeFromApiData(item));
            this.fileStorage.saveNodes(nodes);
            
            return items;
        } catch (error) {
            console.error(`Failed to fetch site ${siteId}:`, error);
            throw error;
        }
    }

    /**
     * ストレージからファイルツリーを構築
     */
    buildFileTreeFromStorage(): FolderTreeNode {
        const nodes = this.fileStorage.getAllNodes().filter(node => node.visible);
        if (nodes.length === 0) {
            return { name: 'Root', type: 'folder', children: [] };
        }

        // ノードを階層構造に変換（保存された表示名を使用）
        const tree: { [key: string]: FolderTreeNode } = {};
        
        nodes.forEach(node => {
            const container = node.displayContainer || '/';
            const name = node.displayName; // 保存された表示名を使用
            const isFolder = node.type === 'folder';

            // containerパスを分解してフォルダ構造を作成
            const containerParts = container.split('/').filter(part => part);
            let currentLevel = tree;

            // コンテナパスの各部分でフォルダを作成
            containerParts.forEach(part => {
                if (!currentLevel[part]) {
                    currentLevel[part] = {
                        name: part,
                        type: 'folder',
                        children: {},
                        isContainer: true
                    } as any;
                }
                if (!currentLevel[part].children) {
                    currentLevel[part].children = [];
                }
                currentLevel = currentLevel[part].children as any;
            });

            // 現在のアイテムを追加（保存された表示名を使用）
            currentLevel[name] = {
                name: name,
                type: isFolder ? 'folder' : 'file',
                children: isFolder ? {} : undefined,
                url: isFolder ? undefined : node.url,
                numChildren: node.numChildren,
                nodeId: node.id, // ノードIDを追加
                isContainer: false
            } as any;
        });

        // ツリー構造を正規化（オブジェクトを配列に変換）
        const normalizeTree = (node: any): FolderTreeNode => {
            const result: FolderTreeNode = {
                name: node.name,
                type: node.type,
                url: node.url,
                numChildren: node.numChildren,
                nodeId: node.nodeId // ノードIDを保持
            };

            if (node.children && typeof node.children === 'object') {
                result.children = Object.values(node.children).map(child => normalizeTree(child));
            }

            return result;
        };

        // ルートノードを作成
        const rootChildren = Object.values(tree).map(child => normalizeTree(child));
        
        return {
            name: 'Root',
            type: 'folder',
            children: rootChildren
        };
    }

    /**
     * フラットなアイテムリストを階層構造に変換（従来の方法、APIデータ用）
     */
    buildFileTree(items: TactContentItem[]): FolderTreeNode {
        if (!items || items.length === 0) {
            return { name: 'Root', type: 'folder', children: [] };
        }

        const tree: { [key: string]: FolderTreeNode } = {};

        items.forEach(item => {
            const container = item.container || '/';
            const name = item.title || item.name || 'Unnamed';
            const isFolder = item.type === 'collection';

            // containerパスを分解してフォルダ構造を作成
            const containerParts = container.split('/').filter(part => part);
            let currentLevel = tree;

            // コンテナパスの各部分でフォルダを作成
            containerParts.forEach(part => {
                if (!currentLevel[part]) {
                    currentLevel[part] = {
                        name: part,
                        type: 'folder',
                        children: {},
                        isContainer: true
                    } as any;
                }
                if (!currentLevel[part].children) {
                    currentLevel[part].children = [];
                }
                currentLevel = currentLevel[part].children as any;
            });

            // 現在のアイテムを追加
            if (currentLevel[name] && (currentLevel[name] as any).isContainer && isFolder) {
                // 既存のコンテナフォルダと統合
                (currentLevel[name] as any).isContainer = false;
                currentLevel[name].numChildren = item.numChildren || 0;
            } else {
                currentLevel[name] = {
                    name: name,
                    type: isFolder ? 'folder' : 'file',
                    children: isFolder ? {} : undefined,
                    url: isFolder ? undefined : item.url,
                    numChildren: item.numChildren || 0,
                    isContainer: false
                } as any;
            }
        });

        // ツリー構造を正規化（オブジェクトを配列に変換）
        const normalizeTree = (node: any): FolderTreeNode => {
            const result: FolderTreeNode = {
                name: node.name,
                type: node.type,
                url: node.url,
                numChildren: node.numChildren
            };

            if (node.children && typeof node.children === 'object') {
                result.children = Object.values(node.children).map(child => normalizeTree(child));
            }

            return result;
        };

        // ルートノードを作成
        const rootChildren = Object.values(tree).map(child => normalizeTree(child));
        
        return {
            name: 'Root',
            type: 'folder',
            children: rootChildren
        };
    }

    /**
     * 現在のページからサイトIDを取得
     */
    getCurrentSiteId(): string | null {
        // URLからサイトIDを抽出
        const url = window.location.href;
        const match = url.match(/\/site\/([^\/]+)/);
        if (match) {
            return match[1];
        }

        // ページ内からサイトIDを探す
        const siteIdElement = document.querySelector('[data-site-id]') || 
                             document.querySelector('#siteId') ||
                             document.querySelector('input[name="siteId"]');
        
        if (siteIdElement) {
            return siteIdElement.getAttribute('data-site-id') || 
                   (siteIdElement as HTMLInputElement).value;
        }

        // デフォルトサイトID（テスト用）
        return 'n_2025_0846280';
    }

    /**
     * ファイルツリーを表示用のHTMLに変換
     */
    renderTreeAsHTML(tree: FolderTreeNode, isEditMode: boolean = false): string {
        if (!tree || !tree.children) return '';

        const renderNode = (node: FolderTreeNode): string => {
            const icon = node.type === 'folder' ? '📂' : '📄';
            const hasChildren = node.children && node.children.length > 0;
            
            // 保存されたノードIDを使用、なければ生成
            const nodeId = node.nodeId || this.generateNodeId(node);
            
            // 編集モード時に移動ボタンを追加
            const moveButton = isEditMode ? `<button class="move-btn" data-item-id="${nodeId}" title="移動">📁</button>` : '';
            
            if (node.type === 'folder') {
                const folderClass = hasChildren ? 'folder-item collapsible' : 'folder-item';
                const toggleIcon = hasChildren ? '<span class="toggle-icon">▼</span>' : '';
                let html = `<li class="${folderClass}" data-node-id="${nodeId}">
                    ${toggleIcon}<span class="folder-name">${icon} 
                    <span class="editable-name" data-original="${node.name}">${node.name}</span>
                    <span class="edit-icon" title="名前を変更">✏️</span>${moveButton}</span>`;
                
                if (hasChildren) {
                    html += '<ul class="folder-children">';
                    node.children!.forEach(child => {
                        html += renderNode(child);
                    });
                    html += '</ul>';
                }
                html += '</li>';
                return html;
            } else {
                const checkboxId = `file-${nodeId}`;
                const checkbox = node.url ? `<input type="checkbox" class="file-checkbox" id="${checkboxId}" data-url="${node.url}" data-filename="${node.name}">` : '';
                const fileName = node.url 
                    ? `<a href="${node.url}" target="_blank" class="file-link"><span class="editable-name" data-original="${node.name}">${node.name}</span></a>`
                    : `<span class="editable-name" data-original="${node.name}">${node.name}</span>`;
                return `<li class="file-item" data-node-id="${nodeId}">
                    ${checkbox}${icon} ${fileName} <span class="edit-icon" title="名前を変更">✏️</span>${moveButton}</li>`;
            }
        };

        const containerClass = isEditMode ? 'edit-mode' : '';
        let html = `<div class="download-controls"><button id="download-selected" class="download-btn" disabled>選択したファイルをダウンロード</button><span class="selected-count">(0件選択)</span></div>`;
        html += `<ul class="folder-tree ${containerClass}">`;
        tree.children.forEach(child => {
            html += renderNode(child);
        });
        html += '</ul>';
        
        return html;
    }

    /**
     * ノードIDを生成（パスベース）
     */
    private generateNodeId(node: FolderTreeNode): string {
        return btoa(encodeURIComponent(node.name)).replace(/[^a-zA-Z0-9]/g, '');
    }

    /**
     * 後方互換性のため残しておく（使用されなくなる予定）
     */
    renderTreeAsString(tree: FolderTreeNode, prefix: string = ''): string {
        return this.renderTreeAsHTML(tree);
    }

    /**
     * サイトIDを設定
     */
    setSiteId(siteId: string): void {
        this.fileStorage.setSiteId(siteId);
    }

    /**
     * ファイル/フォルダ名を変更
     */
    renameItem(id: string, newName: string): boolean {
        return this.fileStorage.renameNode(id, newName);
    }

    /**
     * ファイル/フォルダを移動
     */
    moveItem(nodeId: string, newContainer: string): boolean {
        return this.fileStorage.moveNode(nodeId, newContainer);
    }

    /**
     * ファイル/フォルダの親を変更
     */
    changeItemParent(nodeId: string, newParentId?: string): boolean {
        return this.fileStorage.changeNodeParent(nodeId, newParentId);
    }

    /**
     * ファイル/フォルダの可視性を切り替え
     */
    toggleItemVisibility(nodeId: string): boolean {
        return this.fileStorage.toggleNodeVisibility(nodeId);
    }

    /**
     * 統計情報を生成
     */
    generateStatistics(items: TactContentItem[]): string {
        if (!items || items.length === 0) {
            return '📭 No items found';
        }

        const folders = items.filter(item => item.type === 'collection').length;
        const files = items.filter(item => item.type !== 'collection').length;
        
        return `📊 Total: ${items.length} items (${folders} folders, ${files} files)`;
    }

    /**
     * 現在のサイトのストレージをクリア
     */
    clearCurrentSiteStorage(): void {
        this.fileStorage.clearStorage();
    }

    /**
     * 全サイトのストレージをクリア
     */
    clearAllStorage(): void {
        this.fileStorage.clearAllStorage();
    }
}
