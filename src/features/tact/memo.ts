/**
 * TACTメモ機能のコア実装
 * 講義ごとのメモ作成・管理・エクスポート機能の基盤
 */
/**
 * TACTメモ機能のコア実装
 * 講義ごとのメモ作成・管理・エクスポート機能
 */
/**
 * TACT Portal Memo System
 * TACTポータル用のメモ機能を提供します
 */

/**
 * リンクアイテムのデータ構造
 */
export interface LinkItem {
    id: string;
    url: string;
    title: string;
    description?: string;
}

/**
 * 講義メモのデータ構造
 */
export interface LectureNote {
    id: string;
    lectureId: string;
    lectureName: string;
    note: string;
    links: LinkItem[];
    createdAt: Date;
    updatedAt: Date;
}

/**
 * ローカルストレージのキー
 */
const STORAGE_KEYS = {
    LECTURE_NOTES: 'tact-lecture-notes',
    LECTURE_LINKS: 'tact-lecture-links'
} as const;

/**
 * メモ管理クラス
 */
export class MemoManager {
    
    /**
     * 現在の講義IDを取得
     */
    private getCurrentLectureId(): string | null {
        // TACTのURLから講義IDを抽出
        const url = window.location.href;
        const match = url.match(/\/site\/([^\/]+)/);
        return match ? match[1] : null;
    }

    /**
     * 現在の講義名を取得
     */
    private getCurrentLectureName(): string {
        // 1. ページヘッダーから講義名を取得
        const headerTitle = document.querySelector('.Mrphs-hierarchy--siteName');
        if (headerTitle && headerTitle.textContent) {
            const lectureName = headerTitle.textContent.trim();
            if (lectureName && lectureName !== 'TACT') {
                return lectureName;
            }
        }
        
        // 2. ナビゲーションの現在のツールから講義名を取得
        const currentTool = document.querySelector('.Mrphs-toolTitleNav__link--current');
        if (currentTool && currentTool.textContent) {
            const toolText = currentTool.textContent.trim();
            // ツール名ではなく、その親要素から講義名を探す
            const toolContainer = currentTool.closest('.Mrphs-toolTitleNav');
            if (toolContainer) {
                const siteTitle = toolContainer.querySelector('.Mrphs-toolTitleNav__title');
                if (siteTitle && siteTitle.textContent) {
                    const lectureName = siteTitle.textContent.trim();
                    if (lectureName && lectureName !== 'TACT') {
                        return lectureName;
                    }
                }
            }
        }
        
        // 3. ページタイトルから講義名を取得
        const pageTitle = document.title;
        if (pageTitle) {
            // "講義名 : ツール名 : TACT" の形式を想定
            const parts = pageTitle.split(':');
            if (parts.length >= 2) {
                const lectureName = parts[0].trim();
                if (lectureName && lectureName !== 'TACT' && lectureName !== 'Home') {
                    return lectureName;
                }
            }
        }
        
        // 4. URLから講義IDを取得して講義名として使用
        const lectureId = this.getCurrentLectureId();
        if (lectureId && lectureId !== 'portal') {
            return `講義 (${lectureId})`;
        }
        
        return '不明な講義';
    }

    /**
     * すべてのメモを取得
     */
    getAllNotes(): LectureNote[] {
        const stored = localStorage.getItem(STORAGE_KEYS.LECTURE_NOTES);
        if (!stored) return [];
        
        try {
            const notes = JSON.parse(stored);
            return notes.map((note: any) => ({
                ...note,
                createdAt: new Date(note.createdAt),
                updatedAt: new Date(note.updatedAt)
            }));
        } catch (error) {
            console.error('メモの読み込みに失敗しました:', error);
            return [];
        }
    }

    /**
     * 特定の講義のメモを取得
     */
    getNotesByLectureId(lectureId: string): LectureNote[] {
        return this.getAllNotes().filter(note => note.lectureId === lectureId);
    }

    /**
     * 現在の講義のメモを取得
     */
    getCurrentLectureNotes(): LectureNote[] {
        const lectureId = this.getCurrentLectureId();
        if (!lectureId) return [];
        return this.getNotesByLectureId(lectureId);
    }

    /**
     * メモを保存
     */
    saveNote(note: string, links: LinkItem[] = []): string {
        const lectureId = this.getCurrentLectureId();
        if (!lectureId) {
            throw new Error('現在の講義IDを取得できません');
        }

        const lectureName = this.getCurrentLectureName();
        const noteId = `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const now = new Date();

        const newNote: LectureNote = {
            id: noteId,
            lectureId,
            lectureName,
            note,
            links,
            createdAt: now,
            updatedAt: now
        };

        const allNotes = this.getAllNotes();
        allNotes.push(newNote);
        
        localStorage.setItem(STORAGE_KEYS.LECTURE_NOTES, JSON.stringify(allNotes));
        return noteId;
    }

    /**
     * メモを更新
     */
    updateNote(noteId: string, note: string, links: LinkItem[] = []): boolean {
        const allNotes = this.getAllNotes();
        const index = allNotes.findIndex(n => n.id === noteId);
        
        if (index === -1) return false;
        
        allNotes[index] = {
            ...allNotes[index],
            note,
            links,
            updatedAt: new Date()
        };
        
        localStorage.setItem(STORAGE_KEYS.LECTURE_NOTES, JSON.stringify(allNotes));
        return true;
    }

    /**
     * メモを削除
     */
    deleteNote(noteId: string): boolean {
        const allNotes = this.getAllNotes();
        const filteredNotes = allNotes.filter(note => note.id !== noteId);
        
        if (filteredNotes.length === allNotes.length) return false;
        
        localStorage.setItem(STORAGE_KEYS.LECTURE_NOTES, JSON.stringify(filteredNotes));
        return true;
    }

    /**
     * 講義一覧を取得（メモがある講義のみ）
     */
    getLectureList(): Array<{lectureId: string, lectureName: string, noteCount: number}> {
        const allNotes = this.getAllNotes();
        const lectureMap = new Map<string, {lectureName: string, noteCount: number}>();
        
        allNotes.forEach(note => {
            if (lectureMap.has(note.lectureId)) {
                lectureMap.get(note.lectureId)!.noteCount++;
            } else {
                lectureMap.set(note.lectureId, {
                    lectureName: note.lectureName,
                    noteCount: 1
                });
            }
        });
        
        return Array.from(lectureMap.entries()).map(([lectureId, data]) => ({
            lectureId,
            ...data
        }));
    }

    /**
     * メモをエクスポート
     */
    exportNotes(lectureId?: string): string {
        const notes = lectureId ? this.getNotesByLectureId(lectureId) : this.getAllNotes();
        return JSON.stringify(notes, null, 2);
    }

    /**
     * メモをインポート
     */
    importNotes(jsonData: string): boolean {
        try {
            const importedNotes: LectureNote[] = JSON.parse(jsonData);
            const currentNotes = this.getAllNotes();
            
            // 重複チェック（同じIDがあれば上書き、なければ追加）
            importedNotes.forEach(importedNote => {
                const existingIndex = currentNotes.findIndex(note => note.id === importedNote.id);
                if (existingIndex !== -1) {
                    currentNotes[existingIndex] = {
                        ...importedNote,
                        createdAt: new Date(importedNote.createdAt),
                        updatedAt: new Date(importedNote.updatedAt)
                    };
                } else {
                    currentNotes.push({
                        ...importedNote,
                        createdAt: new Date(importedNote.createdAt),
                        updatedAt: new Date(importedNote.updatedAt)
                    });
                }
            });
            
            localStorage.setItem(STORAGE_KEYS.LECTURE_NOTES, JSON.stringify(currentNotes));
            return true;
        } catch (error) {
            console.error('メモのインポートに失敗しました:', error);
            return false;
        }
    }

    /**
     * メモを検索
     */
    searchNotes(query: string, lectureId?: string): LectureNote[] {
        const notes = lectureId ? this.getNotesByLectureId(lectureId) : this.getAllNotes();
        const lowercaseQuery = query.toLowerCase();
        
        return notes.filter(note => 
            note.note.toLowerCase().includes(lowercaseQuery) ||
            note.lectureName.toLowerCase().includes(lowercaseQuery) ||
            note.links.some(link => 
                link.title.toLowerCase().includes(lowercaseQuery) ||
                link.url.toLowerCase().includes(lowercaseQuery) ||
                (link.description && link.description.toLowerCase().includes(lowercaseQuery))
            )
        );
    }
}

/**
 * リンク管理クラス
 */
export class LinkManager {
    
    /**
     * すべてのリンクを取得
     */
    getAllLinks(): LinkItem[] {
        const stored = localStorage.getItem(STORAGE_KEYS.LECTURE_LINKS);
        if (!stored) return [];
        
        try {
            return JSON.parse(stored);
        } catch (error) {
            console.error('リンクの読み込みに失敗しました:', error);
            return [];
        }
    }

    /**
     * リンクを保存
     */
    saveLink(url: string, title: string, description?: string): string {
        const linkId = `link_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const newLink: LinkItem = {
            id: linkId,
            url,
            title,
            description
        };

        const allLinks = this.getAllLinks();
        allLinks.push(newLink);
        
        localStorage.setItem(STORAGE_KEYS.LECTURE_LINKS, JSON.stringify(allLinks));
        return linkId;
    }

    /**
     * リンクを削除
     */
    deleteLink(linkId: string): boolean {
        const allLinks = this.getAllLinks();
        const filteredLinks = allLinks.filter(link => link.id !== linkId);
        
        if (filteredLinks.length === allLinks.length) return false;
        
        localStorage.setItem(STORAGE_KEYS.LECTURE_LINKS, JSON.stringify(filteredLinks));
        return true;
    }

    /**
     * URLからタイトルを自動取得
     */
    async fetchUrlTitle(url: string): Promise<string> {
        try {
            // CORS制限のため、実際の実装ではプロキシサーバーが必要
            // 現在はURL自体をタイトルとして返す
            const urlObj = new URL(url);
            return urlObj.hostname + urlObj.pathname;
        } catch (error) {
            return url;
        }
    }
}
