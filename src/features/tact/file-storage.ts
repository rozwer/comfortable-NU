/**
 * ファイルシステムノードの型定義とローカルストレージ管理
 */

export interface FileSystemNode {
    id: string;
    originalName: string;
    displayName: string; // 変更後ファイル名
    type: 'file' | 'folder';
    url?: string;
    originalContainer: string;
    displayContainer: string; // 変更後コンテナ
    visible: boolean; // 表示/非表示
    numChildren: number;
    children: string[]; // 子ノードのIDリスト
    parentId?: string; // 親ノードID
    metadata: {
        size?: number;
        lastModified?: string;
        contentType?: string;
    };
    localChanges: {
        moved: boolean;
        renamed: boolean;
        hidden: boolean;
    };
}

export class FileStorage {
    private static readonly STORAGE_KEY_PREFIX = 'tact-file-system';
    private nodes: Map<string, FileSystemNode> = new Map();
    private currentSiteId: string | null = null;

    /**
     * 現在のサイトIDを設定
     */
    setSiteId(siteId: string): void {
        if (this.currentSiteId !== siteId) {
            // サイトが変更された場合、現在のデータを保存して新しいサイトのデータを読み込み
            if (this.currentSiteId) {
                this.saveToStorage();
            }
            this.currentSiteId = siteId;
            this.loadFromStorage();
        }
    }

    /**
     * 現在のサイト用のストレージキーを取得
     */
    private getStorageKey(): string {
        if (!this.currentSiteId) {
            return `${FileStorage.STORAGE_KEY_PREFIX}-default`;
        }
        return `${FileStorage.STORAGE_KEY_PREFIX}-${this.currentSiteId}`;
    }

    /**
     * APIデータからFileSystemNodeを作成
     */
    createNodeFromApiData(item: any, containerId?: string): FileSystemNode {
        const id = this.generateId(item);
        const isFolder = item.type === 'collection';
        
        // 既存のノードがあるかチェック（名前変更などの情報を保持）
        const existingNode = this.nodes.get(id);
        
        return {
            id,
            originalName: item.title || item.name || 'Unnamed',
            displayName: existingNode?.displayName || item.title || item.name || 'Unnamed',
            type: isFolder ? 'folder' : 'file',
            url: item.url,
            originalContainer: item.container || '/',
            displayContainer: existingNode?.displayContainer || item.container || '/',
            visible: existingNode?.visible ?? true,
            numChildren: item.numChildren || 0,
            children: existingNode?.children || [],
            parentId: containerId,
            metadata: {
                contentType: item.contentType,
                ...existingNode?.metadata
            },
            localChanges: existingNode?.localChanges || {
                moved: false,
                renamed: false,
                hidden: false
            }
        };
    }

    /**
     * ノードを保存
     */
    saveNode(node: FileSystemNode): void {
        this.nodes.set(node.id, node);
        this.saveToStorage();
    }

    /**
     * 全ノードを保存
     */
    saveNodes(nodes: FileSystemNode[]): void {
        this.nodes.clear();
        nodes.forEach(node => this.nodes.set(node.id, node));
        this.saveToStorage();
    }

    /**
     * ノードを取得
     */
    getNode(id: string): FileSystemNode | undefined {
        return this.nodes.get(id);
    }

    /**
     * 全ノードを取得
     */
    getAllNodes(): FileSystemNode[] {
        return Array.from(this.nodes.values());
    }

    /**
     * ルートノードを取得
     */
    getRootNodes(): FileSystemNode[] {
        return this.getAllNodes().filter(node => !node.parentId);
    }

    /**
     * ローカルストレージから読み込み
     */
    loadFromStorage(): void {
        try {
            const stored = localStorage.getItem(this.getStorageKey());
            if (stored) {
                const data = JSON.parse(stored);
                this.nodes = new Map(Object.entries(data));
            } else {
                this.nodes.clear();
            }
        } catch (error) {
            console.error('Failed to load from storage:', error);
            this.nodes.clear();
        }
    }

    /**
     * ローカルストレージに保存
     */
    private saveToStorage(): void {
        try {
            const data = Object.fromEntries(this.nodes);
            localStorage.setItem(this.getStorageKey(), JSON.stringify(data));
        } catch (error) {
            console.error('Failed to save to storage:', error);
        }
    }

    /**
     * 一意のIDを生成
     */
    private generateId(item: any): string {
        return `${item.container || '/'}/${item.title || item.name || 'unnamed'}`.replace(/\/+/g, '/');
    }

    /**
     * ノードの表示名を変更
     */
    renameNode(id: string, newDisplayName: string): boolean {
        // IDベースでの検索
        let node = this.nodes.get(id);
        
        // 見つからない場合は名前ベースで検索
        if (!node) {
            const decodedId = this.decodeNodeId(id);
            node = Array.from(this.nodes.values()).find(n => n.originalName === decodedId || n.displayName === decodedId);
        }
        
        if (!node) return false;

        node.displayName = newDisplayName;
        node.localChanges.renamed = node.displayName !== node.originalName;
        this.saveToStorage();
        return true;
    }

    /**
     * ノードを新しい場所に移動
     */
    moveNode(nodeId: string, newContainer: string): boolean {
        // IDベースでの検索
        let node = this.nodes.get(nodeId);
        
        // 見つからない場合は名前ベースで検索
        if (!node) {
            const decodedId = this.decodeNodeId(nodeId);
            node = Array.from(this.nodes.values()).find(n => n.originalName === decodedId || n.displayName === decodedId);
        }
        
        if (!node) return false;

        // 新しいコンテナパスを正規化
        const normalizedContainer = newContainer.startsWith('/') ? newContainer : `/${newContainer}`;
        
        node.displayContainer = normalizedContainer;
        node.localChanges.moved = node.displayContainer !== node.originalContainer;
        this.saveToStorage();
        return true;
    }

    /**
     * ノードの親を変更
     */
    changeNodeParent(nodeId: string, newParentId?: string): boolean {
        let node = this.nodes.get(nodeId);
        
        if (!node) {
            const decodedId = this.decodeNodeId(nodeId);
            node = Array.from(this.nodes.values()).find(n => n.originalName === decodedId || n.displayName === decodedId);
        }
        
        if (!node) return false;

        // 古い親から削除
        if (node.parentId) {
            const oldParent = this.nodes.get(node.parentId);
            if (oldParent) {
                oldParent.children = oldParent.children.filter(id => id !== nodeId);
            }
        }

        // 新しい親に追加
        if (newParentId) {
            const newParent = this.nodes.get(newParentId);
            if (newParent) {
                if (!newParent.children.includes(nodeId)) {
                    newParent.children.push(nodeId);
                }
                node.parentId = newParentId;
                // 親のコンテナパスを基にして新しいコンテナパスを設定
                node.displayContainer = `${newParent.displayContainer}/${newParent.displayName}`;
            }
        } else {
            node.parentId = undefined;
            node.displayContainer = '/';
        }

        node.localChanges.moved = node.displayContainer !== node.originalContainer;
        this.saveToStorage();
        return true;
    }

    /**
     * ノードの可視性を切り替え
     */
    toggleNodeVisibility(nodeId: string): boolean {
        let node = this.nodes.get(nodeId);
        
        if (!node) {
            const decodedId = this.decodeNodeId(nodeId);
            node = Array.from(this.nodes.values()).find(n => n.originalName === decodedId || n.displayName === decodedId);
        }
        
        if (!node) return false;

        node.visible = !node.visible;
        node.localChanges.hidden = !node.visible;
        this.saveToStorage();
        return true;
    }

    /**
     * ノードIDをデコード
     */
    private decodeNodeId(id: string): string {
        try {
            return decodeURIComponent(atob(id));
        } catch {
            return id;
        }
    }

    /**
     * ストレージをクリア
     */
    clearStorage(): void {
        this.nodes.clear();
        if (this.currentSiteId) {
            localStorage.removeItem(this.getStorageKey());
        }
    }

    /**
     * 全サイトのストレージをクリア
     */
    clearAllStorage(): void {
        this.nodes.clear();
        // tact-file-system で始まるすべてのキーを削除
        const keysToDelete: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(FileStorage.STORAGE_KEY_PREFIX)) {
                keysToDelete.push(key);
            }
        }
        keysToDelete.forEach(key => localStorage.removeItem(key));
    }
}
