import { FileSystemNode, TactStructureData, TactStorage } from './tact-storage';

const BASE_URL = 'https://tact.ac.thers.ac.jp';

/**
 * TACT構造の変換とマネージャークラス
 */
export class TactStructureManager {
    private siteId: string;
    private data: TactStructureData | null = null;

    constructor(siteId: string) {
        this.siteId = siteId;
    }

    /**
     * TACT APIからコンテンツを取得
     */
    private async fetchContentFromAPI(siteId: string): Promise<any[] | null> {
        try {
            const response = await fetch(`${BASE_URL}/direct/content/site/${siteId}.json`, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                console.log(`❌ Error: ${response.status} for site ${siteId}`);
                return null;
            }

            const data = await response.json();
            return data.content_collection || [];
        } catch (error) {
            console.error(`🚨 Failed to fetch site ${siteId}:`, error instanceof Error ? error.message : String(error));
            return null;
        }
    }

    /**
     * APIから取得したデータとローカルデータをマージして構造を取得
     */
    async getStructure(): Promise<TactStructureData | null> {
        try {
            // ローカルデータを読み込み
            const localData = TactStorage.load(this.siteId);
            
            // APIから最新データを取得
            const apiData = await this.fetchContentFromAPI(this.siteId);
            if (!apiData || apiData.length === 0) {
                console.log('📭 APIからデータを取得できませんでした');
                return localData;
            }

            // APIデータを変換
            const convertedData = this.convertApiDataToStructure(apiData);
            
            // ローカルデータとマージ
            const mergedData = this.mergeWithLocalData(convertedData, localData);
            
            // ローカルに保存
            TactStorage.save(this.siteId, mergedData);
            
            this.data = mergedData;
            return mergedData;
            
        } catch (error) {
            console.error('❌ 構造の取得に失敗:', error instanceof Error ? error.message : String(error));
            // エラー時はローカルデータを返す
            const localData = TactStorage.load(this.siteId);
            this.data = localData;
            return localData;
        }
    }

    /**
     * APIデータをFileSystemNode構造に変換
     */
    private convertApiDataToStructure(apiData: any[]): TactStructureData {
        const nodes = new Map<string, FileSystemNode>();
        const rootNodes: string[] = [];

        // 各アイテムをノードに変換
        apiData.forEach(item => {
            const nodeId = this.generateNodeId(item);
            const name = item.title || item.name || 'Unnamed';
            const isFolder = item.type === 'collection';
            
            const node: FileSystemNode = {
                id: nodeId,
                originalName: name,
                displayName: name,
                type: isFolder ? 'folder' : 'file',
                url: item.url,
                originalContainer: item.container || '/',
                displayContainer: item.container || '/',
                visible: true,
                numChildren: item.numChildren || 0,
                children: new Map(),
                parent: null,
                metadata: {
                    size: item.size || 0,
                    lastModified: item.modified_time ? new Date(item.modified_time) : null,
                    contentType: item.content_type || null
                },
                localChanges: {
                    moved: false,
                    renamed: false,
                    hidden: false
                }
            };

            nodes.set(nodeId, node);
        });

        // 親子関係を構築
        this.buildHierarchy(nodes, rootNodes);

        return {
            siteId: this.siteId,
            lastUpdated: new Date(),
            nodes,
            rootNodes
        };
    }

    /**
     * 親子関係を構築
     */
    private buildHierarchy(nodes: Map<string, FileSystemNode>, rootNodes: string[]): void {
        // まず、コンテナパスでソート
        const sortedNodes = Array.from(nodes.values()).sort((a, b) => {
            const pathA = a.originalContainer + '/' + a.originalName;
            const pathB = b.originalContainer + '/' + b.originalName;
            return pathA.localeCompare(pathB);
        });

        // 各ノードの親子関係を構築
        sortedNodes.forEach(node => {
            const container = node.originalContainer;
            
            // ルートレベルのアイテム
            if (!container || container === '/' || container === '') {
                rootNodes.push(node.id);
                return;
            }

            // 親フォルダを探す
            let parentFound = false;
            
            // コンテナパスに含まれるフォルダを親として探す
            const containerParts = container.split('/').filter(p => p);
            
            for (const otherNode of nodes.values()) {
                if (otherNode.type === 'folder' && otherNode.id !== node.id) {
                    const folderPath = otherNode.originalContainer + '/' + otherNode.originalName;
                    
                    // このフォルダが現在のノードの直接の親かチェック
                    if (container === folderPath || container.startsWith(folderPath + '/')) {
                        // より具体的な親を探す（最も深い親）
                        let currentParent = otherNode;
                        let currentParentPath = folderPath;
                        
                        for (const candidateNode of nodes.values()) {
                            if (candidateNode.type === 'folder' && candidateNode.id !== node.id && candidateNode.id !== otherNode.id) {
                                const candidatePath = candidateNode.originalContainer + '/' + candidateNode.originalName;
                                
                                if (container.startsWith(candidatePath + '/') && 
                                    candidatePath.length > currentParentPath.length) {
                                    currentParent = candidateNode;
                                    currentParentPath = candidatePath;
                                }
                            }
                        }
                        
                        // 最も適切な親を設定
                        if (container === currentParentPath || 
                            (container.startsWith(currentParentPath + '/') && 
                             container.split('/').length === currentParentPath.split('/').length + 1)) {
                            node.parent = currentParent;
                            currentParent.children.set(node.id, node);
                            parentFound = true;
                            break;
                        }
                    }
                }
            }

            // 親が見つからない場合はルートに追加
            if (!parentFound) {
                rootNodes.push(node.id);
            }
        });

        // 孤立したノードをルートに追加
        nodes.forEach(node => {
            if (!node.parent && !rootNodes.includes(node.id)) {
                rootNodes.push(node.id);
            }
        });
    }

    /**
     * ローカルデータとAPIデータをマージ
     */
    private mergeWithLocalData(apiData: TactStructureData, localData: TactStructureData | null): TactStructureData {
        if (!localData) return apiData;

        // ローカルの変更（リネーム、移動、非表示）を保持
        apiData.nodes.forEach((apiNode, nodeId) => {
            const localNode = localData.nodes.get(nodeId);
            if (localNode) {
                // ローカルの変更を保持
                apiNode.displayName = localNode.displayName;
                apiNode.displayContainer = localNode.displayContainer;
                apiNode.visible = localNode.visible;
                apiNode.localChanges = { ...localNode.localChanges };
            }
        });

        // ローカルにのみ存在するノード（削除されたか移動されたもの）をチェック
        localData.nodes.forEach((localNode, nodeId) => {
            if (!apiData.nodes.has(nodeId)) {
                console.log(`⚠️ ローカルにのみ存在するノード: ${localNode.displayName}`);
                // 必要に応じて処理（例：削除マークを付ける）
            }
        });

        return apiData;
    }

    /**
     * ノードIDを生成
     */
    private generateNodeId(item: any): string {
        // URLまたは名前とコンテナの組み合わせからIDを生成
        if (item.url) {
            return btoa(item.url).replace(/[=+/]/g, '');
        }
        const name = item.title || item.name || 'unnamed';
        const container = item.container || '/';
        return btoa(`${container}/${name}`).replace(/[=+/]/g, '');
    }

    /**
     * 親コンテナパスを取得
     */
    private getParentContainer(containerPath: string): string {
        const parts = containerPath.split('/').filter(p => p);
        if (parts.length <= 1) return '/';
        return '/' + parts.slice(0, -1).join('/');
    }

    /**
     * 現在の構造データを取得
     */
    getCurrentData(): TactStructureData | null {
        return this.data;
    }

    /**
     * ノードの表示名を変更
     */
    renameNode(nodeId: string, newName: string): boolean {
        if (!this.data) return false;
        
        const node = this.data.nodes.get(nodeId);
        if (!node) return false;

        node.displayName = newName;
        node.localChanges.renamed = node.originalName !== newName;
        
        TactStorage.save(this.siteId, this.data);
        return true;
    }

    /**
     * ノードの表示/非表示を切り替え
     */
    toggleNodeVisibility(nodeId: string): boolean {
        if (!this.data) return false;
        
        const node = this.data.nodes.get(nodeId);
        if (!node) return false;

        node.visible = !node.visible;
        node.localChanges.hidden = !node.visible;
        
        TactStorage.save(this.siteId, this.data);
        return true;
    }
}