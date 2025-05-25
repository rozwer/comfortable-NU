/**
 * TACT構造のローカルストレージ管理
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
    children: Map<string, FileSystemNode>; // 子ノード
    parent: FileSystemNode | null; // 親ノード参照
    metadata: {
        size: number;
        lastModified: Date | null;
        contentType: string | null;
    };
    localChanges: {
        moved: boolean;
        renamed: boolean;
        hidden: boolean;
    };
}

export interface TactStructureData {
    siteId: string;
    lastUpdated: Date;
    nodes: Map<string, FileSystemNode>;
    rootNodes: string[]; // ルートレベルのノードID一覧
}

export class TactStorage {
    private static readonly STORAGE_KEY = 'tact-structure';
    private static readonly VERSION = '1.0';

    /**
     * TACT構造をローカルストレージに保存
     */
    static save(siteId: string, data: TactStructureData): void {
        try {
            const serializedData = {
                version: this.VERSION,
                siteId,
                lastUpdated: data.lastUpdated.toISOString(),
                nodes: this.serializeNodes(data.nodes),
                rootNodes: data.rootNodes
            };
            
            localStorage.setItem(
                `${this.STORAGE_KEY}-${siteId}`, 
                JSON.stringify(serializedData)
            );
            
            console.log(`💾 TACT構造を保存しました: ${siteId}`);
        } catch (error) {
            console.error('❌ TACT構造の保存に失敗:', error);
        }
    }

    /**
     * TACT構造をローカルストレージから読み込み
     */
    static load(siteId: string): TactStructureData | null {
        try {
            const stored = localStorage.getItem(`${this.STORAGE_KEY}-${siteId}`);
            if (!stored) return null;

            const data = JSON.parse(stored);
            if (data.version !== this.VERSION) {
                console.warn('⚠️ ストレージバージョンが異なります');
                return null;
            }

            return {
                siteId: data.siteId,
                lastUpdated: new Date(data.lastUpdated),
                nodes: this.deserializeNodes(data.nodes),
                rootNodes: data.rootNodes
            };
        } catch (error) {
            console.error('❌ TACT構造の読み込みに失敗:', error);
            return null;
        }
    }

    /**
     * 特定サイトのデータを削除
     */
    static remove(siteId: string): void {
        localStorage.removeItem(`${this.STORAGE_KEY}-${siteId}`);
        console.log(`🗑️ TACT構造を削除しました: ${siteId}`);
    }

    /**
     * すべてのサイトのデータ一覧を取得
     */
    static listSites(): string[] {
        const sites: string[] = [];
        const prefix = `${this.STORAGE_KEY}-`;
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith(prefix)) {
                sites.push(key.substring(prefix.length));
            }
        }
        
        return sites;
    }

    /**
     * ノードをシリアライズ（Map -> Object）
     */
    private static serializeNodes(nodes: Map<string, FileSystemNode>): any {
        const serialized: any = {};
        
        nodes.forEach((node, id) => {
            serialized[id] = {
                ...node,
                children: this.serializeMap(node.children),
                parent: node.parent?.id || null,
                metadata: {
                    ...node.metadata,
                    lastModified: node.metadata.lastModified?.toISOString() || null
                }
            };
        });
        
        return serialized;
    }

    /**
     * ノードをデシリアライズ（Object -> Map）
     */
    private static deserializeNodes(data: any): Map<string, FileSystemNode> {
        const nodes = new Map<string, FileSystemNode>();
        
        // 最初にすべてのノードを作成（親子関係なし）
        Object.entries(data).forEach(([id, nodeData]: [string, any]) => {
            const node: FileSystemNode = {
                ...nodeData,
                children: new Map(),
                parent: null,
                metadata: {
                    ...nodeData.metadata,
                    lastModified: nodeData.metadata.lastModified 
                        ? new Date(nodeData.metadata.lastModified) 
                        : null
                }
            };
            nodes.set(id, node);
        });

        // 次に親子関係とchildrenを復元
        Object.entries(data).forEach(([id, nodeData]: [string, any]) => {
            const node = nodes.get(id)!;
            
            // 親ノード設定
            if (nodeData.parent) {
                const parentNode = nodes.get(nodeData.parent);
                if (parentNode) {
                    node.parent = parentNode;
                }
            }
            
            // 子ノード設定
            if (nodeData.children) {
                Object.entries(nodeData.children).forEach(([childId, childData]: [string, any]) => {
                    const childNode = nodes.get(childId);
                    if (childNode) {
                        node.children.set(childId, childNode);
                    }
                });
            }
        });
        
        return nodes;
    }

    /**
     * MapをObjectにシリアライズ
     */
    private static serializeMap(map: Map<string, FileSystemNode>): any {
        const obj: any = {};
        map.forEach((value, key) => {
            obj[key] = value.id; // IDのみを保存
        });
        return obj;
    }
}