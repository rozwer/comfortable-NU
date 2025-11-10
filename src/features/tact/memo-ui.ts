/**
 * TACTメモ機能のUIコンポーネント
 * 講義ごとのメモ作成・編集・管理インターフェース
 */
/**
 * TACT Portal Memo UI Components
 * TACTポータル用のメモ機能UIを提供します
 */

import { MemoManager, LinkManager, LectureNote, LinkItem } from './memo';
import { i18nMessage } from '../chrome';

/**
 * メモUIマネージャークラス
 */
export class MemoUI {
    private memoManager: MemoManager;
    private linkManager: LinkManager;
    private container: HTMLElement | null = null;

    constructor() {
        this.memoManager = new MemoManager();
        this.linkManager = new LinkManager();
    }

    /**
     * メモタブのメインコンテンツを作成
     */
    createMemoTabContent(): HTMLElement {
        const container = document.createElement('div');
        container.className = 'cs-memo-container';

        // ヘッダー
        const header = this.createHeader();
        container.appendChild(header);

        // タブナビゲーション
        const tabNav = this.createTabNavigation();
        container.appendChild(tabNav);

        // コンテンツエリア
        const contentArea = document.createElement('div');
        contentArea.className = 'cs-memo-content-area';
        contentArea.id = 'memo-content-area';
        container.appendChild(contentArea);

        // 初期状態で現在の講義メモを表示
        this.showCurrentLectureNotes(contentArea);

        this.container = container;
        return container;
    }

    /**
     * ヘッダー部分を作成
     */
    private createHeader(): HTMLElement {
        const header = document.createElement('div');
        header.className = 'cs-memo-header';

        const title = document.createElement('h3');
        title.textContent = i18nMessage('memo_ui_title');
        title.className = 'cs-memo-title';

        const actions = document.createElement('div');
        actions.className = 'cs-memo-actions';

        // 新規メモボタン
        const newMemoBtn = document.createElement('button');
        newMemoBtn.textContent = i18nMessage('memo_ui_new_memo');
        newMemoBtn.className = 'cs-btn cs-btn-primary';
        newMemoBtn.addEventListener('click', () => this.showNewMemoDialog());

        // // エクスポートボタン
        // const exportBtn = document.createElement('button');
        // exportBtn.textContent = i18nMessage('memo_ui_export');
        // exportBtn.className = 'cs-btn cs-btn-secondary';
        // exportBtn.addEventListener('click', () => this.exportNotes());

        // // インポートボタン
        // const importBtn = document.createElement('button');
        // importBtn.textContent = i18nMessage('memo_ui_import');
        // importBtn.className = 'cs-btn cs-btn-secondary';
        // importBtn.addEventListener('click', () => this.showImportDialog());

        actions.appendChild(newMemoBtn);
        // actions.appendChild(exportBtn);
        // actions.appendChild(importBtn);

        header.appendChild(title);
        header.appendChild(actions);

        return header;
    }

    /**
     * タブナビゲーションを作成
     */
    private createTabNavigation(): HTMLElement {
        const tabNav = document.createElement('div');
        tabNav.className = 'cs-memo-tab-nav';

        const tabs = [
            { id: 'current', label: i18nMessage('memo_ui_tab_current'), icon: '📖' },
            { id: 'all', label: i18nMessage('memo_ui_tab_all'), icon: '📚' },
            { id: 'search', label: i18nMessage('memo_ui_tab_search'), icon: '🔍' }
        ];

        tabs.forEach((tab, index) => {
            const tabButton = document.createElement('button');
            tabButton.className = `cs-memo-tab ${index === 0 ? 'active' : ''}`;
            tabButton.dataset.tabId = tab.id;
            tabButton.innerHTML = `${tab.icon} ${tab.label}`;
            
            tabButton.addEventListener('click', () => {
                // すべてのタブからactiveクラスを削除
                document.querySelectorAll('.cs-memo-tab').forEach(t => t.classList.remove('active'));
                tabButton.classList.add('active');
                
                // コンテンツエリアを更新
                const contentArea = document.getElementById('memo-content-area');
                if (contentArea) {
                    this.showTabContent(tab.id, contentArea);
                }
            });
            
            tabNav.appendChild(tabButton);
        });

        return tabNav;
    }

    /**
     * タブコンテンツを表示
     */
    private showTabContent(tabId: string, contentArea: HTMLElement): void {
        contentArea.innerHTML = '';

        switch (tabId) {
            case 'current':
                this.showCurrentLectureNotes(contentArea);
                break;
            case 'all':
                this.showAllNotes(contentArea);
                break;
            case 'search':
                this.showSearchInterface(contentArea);
                break;
        }
    }

    /**
     * 現在の講義のメモを表示
     */
    private showCurrentLectureNotes(contentArea: HTMLElement): void {
        const notes = this.memoManager.getCurrentLectureNotes();
        
        if (notes.length === 0) {
            contentArea.innerHTML = `
                <div class="cs-memo-empty">
                    <p>📝 この講義にはまだメモがありません</p>
                    <button class="cs-btn cs-btn-primary" onclick="this.closest('.cs-memo-container').querySelector('.cs-memo-actions button').click()">
                        最初のメモを作成
                    </button>
                </div>
            `;
            return;
        }

        const notesList = this.createNotesList(notes);
        contentArea.appendChild(notesList);
    }

    /**
     * すべてのメモを表示
     */
    private showAllNotes(contentArea: HTMLElement): void {
        const lectureList = this.memoManager.getLectureList();
        
        if (lectureList.length === 0) {
            contentArea.innerHTML = `
                <div class="cs-memo-empty">
                    <p>${i18nMessage('memo_ui_no_memos')}</p>
                </div>
            `;
            return;
        }

        const lectureContainer = document.createElement('div');
        lectureContainer.className = 'cs-lecture-list';

        lectureList.forEach(lecture => {
            const lectureSection = document.createElement('div');
            lectureSection.className = 'cs-lecture-section';

            const lectureHeader = document.createElement('div');
            lectureHeader.className = 'cs-lecture-header';
            lectureHeader.innerHTML = `
                <h4>${lecture.lectureName}</h4>
                <span class="cs-note-count">${chrome.i18n.getMessage('memo_ui_memo_count', [lecture.noteCount.toString()])}</span>
            `;

            const toggleBtn = document.createElement('button');
            toggleBtn.className = 'cs-lecture-toggle';
            toggleBtn.textContent = '▼';
            toggleBtn.addEventListener('click', () => {
                const notesContainer = lectureSection.querySelector('.cs-lecture-notes') as HTMLElement;
                if (notesContainer.style.display === 'none') {
                    notesContainer.style.display = 'block';
                    toggleBtn.textContent = '▼';
                } else {
                    notesContainer.style.display = 'none';
                    toggleBtn.textContent = '▶';
                }
            });

            lectureHeader.appendChild(toggleBtn);
            lectureSection.appendChild(lectureHeader);

            const notesContainer = document.createElement('div');
            notesContainer.className = 'cs-lecture-notes';
            const notes = this.memoManager.getNotesByLectureId(lecture.lectureId);
            const notesList = this.createNotesList(notes);
            notesContainer.appendChild(notesList);

            lectureSection.appendChild(notesContainer);
            lectureContainer.appendChild(lectureSection);
        });

        contentArea.appendChild(lectureContainer);
    }

    /**
     * 保存したリンクを表示
     */
    private showSavedLinks(contentArea: HTMLElement): void {
        const links = this.linkManager.getAllLinks();
        
        if (links.length === 0) {
            contentArea.innerHTML = `
                <div class="cs-memo-empty">
                    <p>${i18nMessage('memo_ui_no_links')}</p>
                    <button class="cs-btn cs-btn-primary" onclick="this.addNewLink()">
                        ${i18nMessage('memo_ui_add_link')}
                    </button>
                </div>
            `;
            return;
        }

        const linksContainer = document.createElement('div');
        linksContainer.className = 'cs-links-container';

        // 新規リンク追加ボタン
        const addLinkBtn = document.createElement('button');
        addLinkBtn.textContent = i18nMessage('memo_ui_add_link_button');
        addLinkBtn.className = 'cs-btn cs-btn-primary cs-add-link-btn';
        addLinkBtn.addEventListener('click', () => this.showNewLinkDialog());
        linksContainer.appendChild(addLinkBtn);

        // リンクリスト
        const linksList = document.createElement('div');
        linksList.className = 'cs-links-list';

        links.forEach(link => {
            const linkItem = this.createLinkItem(link);
            linksList.appendChild(linkItem);
        });

        linksContainer.appendChild(linksList);
        contentArea.appendChild(linksContainer);
    }

    /**
     * 検索インターフェースを表示
     */
    private showSearchInterface(contentArea: HTMLElement): void {
        const searchContainer = document.createElement('div');
        searchContainer.className = 'cs-search-container';

        // 検索フォーム
        const searchForm = document.createElement('div');
        searchForm.className = 'cs-search-form';

        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.placeholder = i18nMessage('memo_ui_search_placeholder');
        searchInput.className = 'cs-search-input';

        const searchBtn = document.createElement('button');
        searchBtn.textContent = '🔍';
        searchBtn.className = 'cs-btn cs-btn-primary';

        const searchResults = document.createElement('div');
        searchResults.className = 'cs-search-results';
        searchResults.id = 'search-results';

        const performSearch = () => {
            const query = searchInput.value.trim();
            if (query.length < 2) {
                searchResults.innerHTML = `<p>${i18nMessage('memo_ui_search_min_chars')}</p>`;
                return;
            }

            const results = this.memoManager.searchNotes(query);
            if (results.length === 0) {
                searchResults.innerHTML = `<p>${i18nMessage('memo_ui_search_no_results')}</p>`;
                return;
            }

            searchResults.innerHTML = '';
            const resultsList = this.createNotesList(results);
            searchResults.appendChild(resultsList);
        };

        searchBtn.addEventListener('click', performSearch);
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                performSearch();
            }
        });

        searchForm.appendChild(searchInput);
        searchForm.appendChild(searchBtn);
        searchContainer.appendChild(searchForm);
        searchContainer.appendChild(searchResults);

        contentArea.appendChild(searchContainer);
    }

    /**
     * ノートリストを作成
     */
    private createNotesList(notes: LectureNote[]): HTMLElement {
        const notesList = document.createElement('div');
        notesList.className = 'cs-notes-list';

        notes.forEach(note => {
            const noteItem = this.createNoteItem(note);
            notesList.appendChild(noteItem);
        });

        return notesList;
    }

    /**
     * ノートアイテムを作成
     */
    private createNoteItem(note: LectureNote): HTMLElement {
        const noteItem = document.createElement('div');
        noteItem.className = 'cs-note-item';

        // リンクがある場合はクリック可能にする
        if (note.links.length > 0) {
            noteItem.classList.add('cs-note-item--clickable');
            noteItem.addEventListener('click', (e) => {
                // 編集・削除ボタンがクリックされた場合は無視
                if ((e.target as HTMLElement).closest('.cs-note-actions')) {
                    return;
                }
                
                // リンクが1つの場合は直接開く
                if (note.links.length === 1) {
                    window.open(note.links[0].url, '_blank');
                } else {
                    // 複数リンクの場合は選択ダイアログを表示
                    this.showLinkSelectionDialog(note.links);
                }
            });
        }

        const noteHeader = document.createElement('div');
        noteHeader.className = 'cs-note-header';

        const noteTitle = document.createElement('div');
        noteTitle.className = 'cs-note-title';
        noteTitle.textContent = note.lectureName;

        const noteDate = document.createElement('div');
        noteDate.className = 'cs-note-date';
        // モバイルでの表示不具合を修正: toLocaleDateString()の代わりに明示的なフォーマットを使用
        const date = note.updatedAt;
        noteDate.textContent = `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;

        const noteActions = document.createElement('div');
        noteActions.className = 'cs-note-actions';

        const editBtn = document.createElement('button');
        editBtn.textContent = '✏️';
        editBtn.className = 'cs-note-action-btn';
        editBtn.title = '編集';
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.editNote(note);
        });

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = '🗑️';
        deleteBtn.className = 'cs-note-action-btn cs-delete-btn';
        deleteBtn.title = '削除';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.deleteNote(note.id);
        });

        noteActions.appendChild(editBtn);
        noteActions.appendChild(deleteBtn);

        noteHeader.appendChild(noteTitle);
        noteHeader.appendChild(noteDate);
        noteHeader.appendChild(noteActions);

        const noteContent = document.createElement('div');
        noteContent.className = 'cs-note-content';
        noteContent.textContent = note.note.substring(0, 200) + (note.note.length > 200 ? '...' : '');

        if (note.links.length > 0) {
            const noteLinks = document.createElement('div');
            noteLinks.className = 'cs-note-links';
            noteLinks.innerHTML = `🔗 ${note.links.length}個のリンク ${note.links.length === 1 ? '(クリックで開く)' : '(クリックで選択)'}`;
        }

        noteItem.appendChild(noteHeader);
        noteItem.appendChild(noteContent);
        
        if (note.links.length > 0) {
            const noteLinks = document.createElement('div');
            noteLinks.className = 'cs-note-links';
            noteLinks.innerHTML = `🔗 ${note.links.length}個のリンク ${note.links.length === 1 ? '(クリックで開く)' : '(クリックで選択)'}`;
            noteItem.appendChild(noteLinks);
        }

        return noteItem;
    }

    /**
     * リンクアイテムを作成
     */
    private createLinkItem(link: LinkItem): HTMLElement {
        const linkItem = document.createElement('div');
        linkItem.className = 'cs-link-item';

        const linkContent = document.createElement('div');
        linkContent.className = 'cs-link-content';

        const linkTitle = document.createElement('a');
        linkTitle.href = link.url;
        linkTitle.target = '_blank';
        linkTitle.className = 'cs-link-title';
        linkTitle.textContent = link.title;

        const linkUrl = document.createElement('div');
        linkUrl.className = 'cs-link-url';
        linkUrl.textContent = link.url;

        if (link.description) {
            const linkDesc = document.createElement('div');
            linkDesc.className = 'cs-link-description';
            linkDesc.textContent = link.description;
            linkContent.appendChild(linkDesc);
        }

        const linkActions = document.createElement('div');
        linkActions.className = 'cs-link-actions';

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = '🗑️';
        deleteBtn.className = 'cs-link-action-btn cs-delete-btn';
        deleteBtn.title = '削除';
        deleteBtn.addEventListener('click', () => this.deleteLink(link.id));

        linkActions.appendChild(deleteBtn);

        linkContent.appendChild(linkTitle);
        linkContent.appendChild(linkUrl);
        linkItem.appendChild(linkContent);
        linkItem.appendChild(linkActions);

        return linkItem;
    }

    /**
     * 新規メモダイアログを表示
     */
    private showNewMemoDialog(): void {
        this.showMemoDialog();
    }

    /**
     * メモ編集
     */
    private editNote(note: LectureNote): void {
        this.showMemoDialog(note);
    }

    /**
     * メモダイアログを表示
     */
    private showMemoDialog(note?: LectureNote): void {
        const dialog = document.createElement('div');
        dialog.className = 'cs-memo-dialog-overlay';

        const dialogContent = document.createElement('div');
        dialogContent.className = 'cs-memo-dialog';

        const title = document.createElement('h3');
        title.textContent = note ? i18nMessage('memo_ui_memo_dialog_edit') : i18nMessage('memo_ui_memo_dialog_new');

        const textarea = document.createElement('textarea');
        textarea.className = 'cs-memo-textarea';
        textarea.placeholder = i18nMessage('memo_ui_memo_dialog_placeholder');
        textarea.value = note ? note.note : '';

        const linksContainer = document.createElement('div');
        linksContainer.className = 'cs-memo-links-container';
        
        const linksLabel = document.createElement('label');
        linksLabel.textContent = i18nMessage('memo_ui_memo_dialog_links_label');
        
        const linksTextarea = document.createElement('textarea');
        linksTextarea.className = 'cs-memo-links-textarea';
        linksTextarea.placeholder = i18nMessage('memo_ui_memo_dialog_links_placeholder');
        
        // 既存のリンクを表示用の形式に変換
        let linksText = '';
        if (note && note.links.length > 0) {
            linksText = note.links.map(link => 
                link.title ? `${link.url} ${link.title}` : link.url
            ).join('\n');
        }
        linksTextarea.value = linksText;

        const actions = document.createElement('div');
        actions.className = 'cs-memo-dialog-actions';

        const saveBtn = document.createElement('button');
        saveBtn.textContent = i18nMessage('memo_ui_memo_dialog_save');
        saveBtn.className = 'cs-btn cs-btn-primary';

        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = i18nMessage('memo_ui_memo_dialog_cancel');
        cancelBtn.className = 'cs-btn cs-btn-secondary';

        saveBtn.addEventListener('click', () => {
            const noteContent = textarea.value.trim();
            if (!noteContent) {
                alert(i18nMessage('memo_ui_memo_dialog_empty_error'));
                return;
            }

            // リンクテキストを解析してLinkItem[]に変換
            const linkTexts = linksTextarea.value
                .split('\n')
                .map(line => line.trim())
                .filter(line => line.length > 0);

            const links: LinkItem[] = linkTexts.map((linkText, index) => {
                const parts = linkText.split(' ');
                const url = parts[0];
                const title = parts.slice(1).join(' ') || `リンク ${index + 1}`;
                
                return {
                    id: `link_${Date.now()}_${index}`,
                    url,
                    title,
                    description: ''
                };
            });

            try {
                if (note) {
                    this.memoManager.updateNote(note.id, noteContent, links);
                } else {
                    this.memoManager.saveNote(noteContent, links);
                }
                dialog.remove();
                this.refreshCurrentView();
            } catch (error) {
                alert(i18nMessage('memo_ui_save_error') + error);
            }
        });

        cancelBtn.addEventListener('click', () => {
            dialog.remove();
        });

        actions.appendChild(saveBtn);
        actions.appendChild(cancelBtn);

        linksContainer.appendChild(linksLabel);
        linksContainer.appendChild(linksTextarea);

        dialogContent.appendChild(title);
        dialogContent.appendChild(textarea);
        dialogContent.appendChild(linksContainer);
        dialogContent.appendChild(actions);

        dialog.appendChild(dialogContent);
        document.body.appendChild(dialog);

        textarea.focus();
    }

    /**
     * 新規リンクダイアログを表示
     */
    private showNewLinkDialog(): void {
        const dialog = document.createElement('div');
        dialog.className = 'cs-memo-dialog-overlay';

        const dialogContent = document.createElement('div');
        dialogContent.className = 'cs-memo-dialog';

        const title = document.createElement('h3');
        title.textContent = i18nMessage('memo_ui_link_dialog_title');

        const urlInput = document.createElement('input');
        urlInput.type = 'url';
        urlInput.className = 'cs-memo-input';
        urlInput.placeholder = i18nMessage('memo_ui_link_dialog_url_placeholder');

        const titleInput = document.createElement('input');
        titleInput.type = 'text';
        titleInput.className = 'cs-memo-input';
        titleInput.placeholder = i18nMessage('memo_ui_link_dialog_title_placeholder');

        const descInput = document.createElement('textarea');
        descInput.className = 'cs-memo-textarea';
        descInput.placeholder = i18nMessage('memo_ui_link_dialog_desc_placeholder');
        descInput.rows = 3;

        const actions = document.createElement('div');
        actions.className = 'cs-memo-dialog-actions';

        const saveBtn = document.createElement('button');
        saveBtn.textContent = i18nMessage('memo_ui_memo_dialog_save');
        saveBtn.className = 'cs-btn cs-btn-primary';

        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = i18nMessage('memo_ui_memo_dialog_cancel');
        cancelBtn.className = 'cs-btn cs-btn-secondary';

        saveBtn.addEventListener('click', () => {
            const url = urlInput.value.trim();
            const titleValue = titleInput.value.trim();
            
            if (!url) {
                alert(i18nMessage('memo_ui_link_dialog_url_required'));
                return;
            }

            const description = descInput.value.trim();
            this.linkManager.saveLink(url, titleValue || url, description);
            dialog.remove();
            this.refreshCurrentView();
        });

        cancelBtn.addEventListener('click', () => {
            dialog.remove();
        });

        actions.appendChild(saveBtn);
        actions.appendChild(cancelBtn);

        dialogContent.appendChild(title);
        dialogContent.appendChild(urlInput);
        dialogContent.appendChild(titleInput);
        dialogContent.appendChild(descInput);
        dialogContent.appendChild(actions);

        dialog.appendChild(dialogContent);
        document.body.appendChild(dialog);

        urlInput.focus();
    }

    /**
     * メモを削除
     */
    private deleteNote(noteId: string): void {
        if (confirm(i18nMessage('memo_ui_delete_note_confirm'))) {
            this.memoManager.deleteNote(noteId);
            this.refreshCurrentView();
        }
    }

    /**
     * リンクを削除
     */
    private deleteLink(linkId: string): void {
        if (confirm(i18nMessage('memo_ui_delete_link_confirm'))) {
            this.linkManager.deleteLink(linkId);
            this.refreshCurrentView();
        }
    }

    /**
     * メモをエクスポート
     */
    private exportNotes(): void {
        const notes = this.memoManager.getAllNotes();
        const dataStr = JSON.stringify(notes, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `tact-memos-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
    }

    /**
     * インポートダイアログを表示
     */
    private showImportDialog(): void {
        const dialog = document.createElement('div');
        dialog.className = 'cs-memo-dialog-overlay';

        const dialogContent = document.createElement('div');
        dialogContent.className = 'cs-memo-dialog';

        const title = document.createElement('h3');
        title.textContent = i18nMessage('memo_ui_import_dialog_title');

        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.json';
        fileInput.className = 'cs-memo-input';

        const actions = document.createElement('div');
        actions.className = 'cs-memo-dialog-actions';

        const importBtn = document.createElement('button');
        importBtn.textContent = i18nMessage('memo_ui_import');
        importBtn.className = 'cs-btn cs-btn-primary';

        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = i18nMessage('memo_ui_memo_dialog_cancel');
        cancelBtn.className = 'cs-btn cs-btn-secondary';

        importBtn.addEventListener('click', () => {
            const file = fileInput.files?.[0];
            if (!file) {
                alert(i18nMessage('memo_ui_import_dialog_file_required'));
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const content = e.target?.result as string;
                    if (this.memoManager.importNotes(content)) {
                        alert(i18nMessage('memo_ui_import_success'));
                        dialog.remove();
                        this.refreshCurrentView();
                    } else {
                        alert(i18nMessage('memo_ui_import_failed'));
                    }
                } catch (error) {
                    alert(i18nMessage('memo_ui_file_read_failed'));
                }
            };
            reader.readAsText(file);
        });

        cancelBtn.addEventListener('click', () => {
            dialog.remove();
        });

        actions.appendChild(importBtn);
        actions.appendChild(cancelBtn);

        dialogContent.appendChild(title);
        dialogContent.appendChild(fileInput);
        dialogContent.appendChild(actions);

        dialog.appendChild(dialogContent);
        document.body.appendChild(dialog);
    }

    /**
     * 現在のビューを更新
     */
    private refreshCurrentView(): void {
        const activeTab = document.querySelector('.cs-memo-tab.active') as HTMLElement;
        const contentArea = document.getElementById('memo-content-area');
        
        if (activeTab && contentArea) {
            const tabId = activeTab.dataset.tabId;
            if (tabId) {
                this.showTabContent(tabId, contentArea);
            }
        }
    }

    /**
     * リンク選択ダイアログを表示
     */
    private showLinkSelectionDialog(links: LinkItem[]): void {
        // ダイアログを作成
        const dialog = document.createElement('div');
        dialog.className = 'cs-memo-dialog';

        const dialogContent = document.createElement('div');
        dialogContent.className = 'cs-memo-dialog-content';

        const title = document.createElement('h3');
        title.textContent = i18nMessage('memo_ui_link_selection_title');

        const linkList = document.createElement('div');
        linkList.className = 'cs-link-selection-list';

        // リンクリストを作成
        links.forEach(link => {
            const linkItem = document.createElement('div');
            linkItem.className = 'cs-link-selection-item';
            linkItem.addEventListener('click', () => {
                window.open(link.url, '_blank');
                dialog.remove();
            });

            const linkTitle = document.createElement('div');
            linkTitle.className = 'cs-link-selection-title';
            linkTitle.textContent = link.title;

            const linkUrl = document.createElement('div');
            linkUrl.className = 'cs-link-selection-url';
            linkUrl.textContent = link.url;

            if (link.description) {
                const linkDesc = document.createElement('div');
                linkDesc.className = 'cs-link-selection-description';
                linkDesc.textContent = link.description;
                linkItem.appendChild(linkDesc);
            }

            linkItem.appendChild(linkTitle);
            linkItem.appendChild(linkUrl);
            linkList.appendChild(linkItem);
        });

        const actions = document.createElement('div');
        actions.className = 'cs-memo-dialog-actions';

        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = i18nMessage('memo_ui_cancel');
        cancelBtn.className = 'cs-btn cs-btn-secondary';
        cancelBtn.addEventListener('click', () => {
            dialog.remove();
        });

        actions.appendChild(cancelBtn);

        dialogContent.appendChild(title);
        dialogContent.appendChild(linkList);
        dialogContent.appendChild(actions);

        dialog.appendChild(dialogContent);
        document.body.appendChild(dialog);
    }
}
