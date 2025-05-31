/**
 * TACTフォルダ機能のコア実装
 * フォルダ構造の管理と操作機能
 */
export interface FolderItem {
    id: string;
    name: string;
    type: 'folder' | 'file';
    parentId?: string;
    path: string;
    createdAt: Date;
    updatedAt: Date;
    size?: number;
}

export class FolderManager {
    private folders: Map<string, FolderItem> = new Map();
    private eventListeners: Map<string, Function[]> = new Map();

    addEventListener(event: string, callback: Function) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event)!.push(callback);
    }

    removeEventListener(event: string, callback: Function) {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            const index = listeners.indexOf(callback);
            if (index !== -1) {
                listeners.splice(index, 1);
            }
        }
    }

    private emit(event: string, data?: any) {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            listeners.forEach(callback => callback(data));
        }
    }

    getAllFolders(): FolderItem[] {
        return Array.from(this.folders.values());
    }

    getCurrentLectureFolders(): FolderItem[] {
        // サンプルデータ - 実際のAPIから取得する実装に置き換え
        return [
            {
                id: '1',
                name: '今日の資料',
                type: 'folder',
                path: '/current/today',
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                id: '2',
                name: '課題提出',
                type: 'folder',
                path: '/current/assignments',
                createdAt: new Date(),
                updatedAt: new Date()
            }
        ];
    }

    getRecentFiles(): FolderItem[] {
        // サンプルデータ - 実際のAPIから取得する実装に置き換え
        return [
            {
                id: '10',
                name: 'レポート.docx',
                type: 'file',
                path: '/recent/report.docx',
                createdAt: new Date(Date.now() - 86400000), // 1日前
                updatedAt: new Date(),
                size: 1024000
            },
            {
                id: '11',
                name: '講義ノート.pdf',
                type: 'file',
                path: '/recent/notes.pdf',
                createdAt: new Date(Date.now() - 172800000), // 2日前
                updatedAt: new Date(),
                size: 2048000
            }
        ];
    }

    searchFolders(query: string): FolderItem[] {
        if (!query.trim()) {
            return [];
        }
        
        // サンプル検索結果 - 実際の検索ロジックに置き換え
        const allItems = [...this.getCurrentLectureFolders(), ...this.getRecentFiles()];
        return allItems.filter(item => 
            item.name.toLowerCase().includes(query.toLowerCase())
        );
    }

    createFolder(name: string, parentId?: string): FolderItem {
        const folder: FolderItem = {
            id: Date.now().toString(),
            name,
            type: 'folder',
            parentId,
            path: parentId ? `/folders/${parentId}/${name}` : `/folders/${name}`,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        
        this.folders.set(folder.id, folder);
        this.emit('folderCreated', folder);
        return folder;
    }

    deleteFolder(id: string): boolean {
        const folder = this.folders.get(id);
        if (folder) {
            this.folders.delete(id);
            this.emit('folderDeleted', folder);
            return true;
        }
        return false;
    }
}