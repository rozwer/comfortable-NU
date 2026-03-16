/**
 * 共有ツリーUI
 * per-course (folder-ui) と cross-folder browser の両方から使用される
 * ツリー描画・トグル・リネーム・ダウンロード機能を提供
 */
import JSZip from 'jszip';
import { createLogger } from '../../utils/logger';

const logger = createLogger('tree-ui');

// ---------------------------------------------------------------------------
// 共通型
// ---------------------------------------------------------------------------

/** ツリーノード共通型 */
export interface TreeNode {
    name: string;
    type: 'semester' | 'course' | 'folder' | 'file';
    children?: TreeNode[];
    url?: string;
    webLinkUrl?: string;
    nodeId?: string;
    isNew?: boolean;
    numChildren?: number;
}

/** ツリー描画オプション */
export interface TreeRenderOptions {
    /** リネーム・移動ボタンを表示するか */
    isEditMode?: boolean;
    /** チェックボックス + ダウンロードコントロールを表示するか */
    showDownloadControls?: boolean;
}

/** ツリー操作コールバック */
export interface TreeCallbacks {
    /** リネーム時に呼ばれる。成功なら true を返す */
    onRename?: (nodeId: string, newName: string) => boolean;
    /** 移動ボタン押下時に呼ばれる */
    onMove?: (nodeId: string) => void;
    /** ツリーの再描画をリクエストする */
    onRefreshTree?: () => void;
}

// ---------------------------------------------------------------------------
// ユーティリティ
// ---------------------------------------------------------------------------

function escapeHtml(str: string): string {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;')
              .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
              .replace(/'/g, '&#39;');
}

export function isNussLink(url: string): boolean {
    return url.includes('nuss.nagoya-u.ac.jp') || url.includes('https%3A__nuss.nagoya-u.ac.jp');
}

// ---------------------------------------------------------------------------
// content / group 等の中間フォルダ除去
// ---------------------------------------------------------------------------

/**
 * content / group-xxx 等の中間フォルダを再帰的にスキップする
 * TACT の Content API パス構造 (/content/group/{siteId}/...) に対応
 */
export function unwrapIntermediateFolders(nodes: TreeNode[]): TreeNode[] {
    const result: TreeNode[] = [];
    for (const node of nodes) {
        const name = node.name.toLowerCase();
        // content, group*, TACT サイトID (n_YYYY_XXXXXXX) を中間フォルダとして除去
        const isIntermediate = node.type === 'folder' &&
            (name === 'content' || name.startsWith('group') || /^n_\d{4}_/.test(name)) &&
            node.children && node.children.length > 0;
        if (isIntermediate) {
            result.push(...unwrapIntermediateFolders(node.children!));
        } else {
            if (node.children) {
                node.children = unwrapIntermediateFolders(node.children);
            }
            result.push(node);
        }
    }
    return result;
}

// ---------------------------------------------------------------------------
// ツリー HTML 描画
// ---------------------------------------------------------------------------

/**
 * ツリーノード配列を HTML 文字列に変換する
 * tact-extension.css の .folder-tree / .folder-item / .file-item クラスを使用
 */
export function renderTreeHTML(nodes: TreeNode[], options: TreeRenderOptions = {}): string {
    const { isEditMode = false, showDownloadControls = true } = options;

    const renderNode = (node: TreeNode): string => {
        const hasChildren = node.children && node.children.length > 0;
        const safeNodeId = node.nodeId ? escapeHtml(node.nodeId) : '';
        const safeName = escapeHtml(node.name);

        // semester / course は特殊フォルダとして扱う
        if (node.type === 'semester' || node.type === 'course') {
            const icon = node.type === 'semester' ? '📅' : '📚';
            const cssClass = node.type === 'semester' ? 'tree-semester' : 'tree-course';
            const folderClass = hasChildren ? `folder-item collapsible ${cssClass}` : `folder-item ${cssClass}`;
            const toggleIcon = hasChildren ? '<span class="toggle-icon">▶</span>' : '';

            let html = `<li class="${folderClass}">
                ${toggleIcon}<span class="folder-name">${icon}
                <span class="node-label">${safeName}</span></span>`;

            if (hasChildren) {
                html += '<ul class="folder-children" style="display:none">';
                node.children!.forEach(child => { html += renderNode(child); });
                html += '</ul>';
            }
            html += '</li>';
            return html;
        }

        // folder / file
        const moveButton = isEditMode && safeNodeId
            ? `<button class="move-btn" data-item-id="${safeNodeId}" title="移動">📁</button>`
            : '';

        if (node.type === 'folder') {
            const folderClass = hasChildren ? 'folder-item collapsible' : 'folder-item';
            const toggleIcon = hasChildren ? '<span class="toggle-icon">▶</span>' : '';
            let html = `<li class="${folderClass}" data-node-id="${safeNodeId}">
                ${toggleIcon}<span class="folder-name">📂
                <span class="editable-name" data-original="${safeName}">${safeName}</span>
                <span class="edit-icon" title="名前を変更">✏️</span>${moveButton}</span>`;

            if (hasChildren) {
                html += '<ul class="folder-children" style="display:none">';
                node.children!.forEach(child => { html += renderNode(child); });
                html += '</ul>';
            }
            html += '</li>';
            return html;
        }

        // file
        const checkboxId = safeNodeId ? `file-${safeNodeId}` : '';
        const safeUrl = node.url ? escapeHtml(node.url) : '';
        const safeWebLinkUrl = node.webLinkUrl ? escapeHtml(node.webLinkUrl) : '';
        const weblinkAttr = safeWebLinkUrl ? ` data-weblink-url="${safeWebLinkUrl}"` : '';
        const checkbox = showDownloadControls && node.url
            ? `<input type="checkbox" class="file-checkbox" id="${checkboxId}" data-url="${safeUrl}" data-filename="${safeName}"${weblinkAttr}>`
            : '';
        const fileName = node.url
            ? `<a href="${safeUrl}" target="_blank" class="file-link"><span class="editable-name" data-original="${safeName}">${safeName}</span></a>`
            : `<span class="editable-name" data-original="${safeName}">${safeName}</span>`;

        const isNuss = (node.url && isNussLink(node.url)) || (node.webLinkUrl && isNussLink(node.webLinkUrl));
        const nussLabel = isNuss
            ? '<span class="nuss-label" style="color: #28a745; font-weight: bold; margin-left: 8px;">nuss</span>'
            : '';

        const newBadge = node.isNew
            ? '<span class="cfb-badge-new">NEW</span>'
            : '';

        return `<li class="file-item" data-node-id="${safeNodeId}">
            ${checkbox}📄 ${fileName}${nussLabel}${newBadge} <span class="edit-icon" title="名前を変更">✏️</span>${moveButton}</li>`;
    };

    let html = '';

    if (showDownloadControls) {
        html += '<div class="download-controls"><button id="download-selected" class="download-btn" disabled>選択したファイルをダウンロード</button><span class="selected-count">(0件選択)</span></div>';
    }

    const containerClass = isEditMode ? 'edit-mode' : '';
    html += `<ul class="folder-tree ${containerClass}">`;
    nodes.forEach(node => { html += renderNode(node); });
    html += '</ul>';

    return html;
}

// ---------------------------------------------------------------------------
// イベントバインド
// ---------------------------------------------------------------------------

/**
 * ツリーコンテナに対して toggle / rename / download のイベントを一括バインドする
 */
export function bindTreeInteractions(container: Element, callbacks: TreeCallbacks = {}): void {
    bindFolderToggle(container);
    bindEditListeners(container, callbacks);
    bindDownloadListeners(container);
    if (callbacks.onMove) {
        bindMoveListeners(container, callbacks);
    }
}

/** フォルダ開閉トグル */
function bindFolderToggle(container: Element): void {
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

            [toggleIcon, folderName].forEach(element => {
                element.addEventListener('click', toggleFolder);
                (element as HTMLElement).style.cursor = 'pointer';
            });
        }
    });
}

/** リネーム（インライン編集） */
function bindEditListeners(container: Element, callbacks: TreeCallbacks): void {
    const editIcons = container.querySelectorAll('.edit-icon');

    editIcons.forEach(editIcon => {
        editIcon.addEventListener('click', (e) => {
            e.stopPropagation();

            const editableElement = editIcon.parentElement?.querySelector('.editable-name');
            const nodeElement = editIcon.closest('[data-node-id]');

            if (editableElement && nodeElement) {
                makeEditable(editableElement as HTMLElement, nodeElement as HTMLElement, callbacks);
            }
        });
    });
}

function makeEditable(editableElement: HTMLElement, nodeElement: HTMLElement, callbacks: TreeCallbacks): void {
    const originalText = editableElement.textContent || '';
    const nodeId = nodeElement.getAttribute('data-node-id');

    const input = document.createElement('input');
    input.type = 'text';
    input.value = originalText;
    input.className = 'edit-input';
    input.style.cssText = 'border: 1px solid #007bff; outline: none; background: white; padding: 2px;';

    const saveEdit = () => {
        const newName = input.value.trim();
        if (newName && newName !== originalText && nodeId && callbacks.onRename) {
            if (callbacks.onRename(nodeId, newName)) {
                editableElement.textContent = newName;
                editableElement.setAttribute('data-original', newName);
                if (callbacks.onRefreshTree) callbacks.onRefreshTree();
            } else {
                alert('ファイル名の変更に失敗しました');
            }
        }
        editableElement.style.display = '';
        input.remove();
    };

    const cancelEdit = () => {
        editableElement.style.display = '';
        input.remove();
    };

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); saveEdit(); }
        else if (e.key === 'Escape') { e.preventDefault(); cancelEdit(); }
    });

    input.addEventListener('blur', saveEdit);

    editableElement.style.display = 'none';
    editableElement.parentNode?.insertBefore(input, editableElement.nextSibling);
    input.focus();
    input.select();
}

/** ダウンロード（チェックボックス + ZIPダウンロード） */
function bindDownloadListeners(container: Element): void {
    const downloadButton = container.querySelector('#download-selected') as HTMLButtonElement;
    const selectedCountSpan = container.querySelector('.selected-count') as HTMLSpanElement;
    const checkboxes = container.querySelectorAll('.file-checkbox') as NodeListOf<HTMLInputElement>;

    if (!downloadButton || !selectedCountSpan) return;

    const updateSelectedCount = () => {
        const count = Array.from(checkboxes).filter(cb => cb.checked).length;
        selectedCountSpan.textContent = `(${count}件選択)`;
        downloadButton.disabled = count === 0;
    };

    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', updateSelectedCount);
    });

    downloadButton.addEventListener('click', async () => {
        const selectedCheckboxes = Array.from(checkboxes).filter(cb => cb.checked);
        if (selectedCheckboxes.length === 0) {
            alert('ダウンロードするファイルを選択してください。');
            return;
        }

        try {
            downloadButton.disabled = true;
            downloadButton.textContent = 'ダウンロード中...';
            await downloadSelectedFiles(selectedCheckboxes, downloadButton);
            selectedCheckboxes.forEach(cb => cb.checked = false);
            updateSelectedCount();
        } catch (error) {
            logger.error('ダウンロードエラー:', error);
            alert('ダウンロード中にエラーが発生しました。');
        } finally {
            downloadButton.disabled = false;
            downloadButton.textContent = '選択したファイルをダウンロード';
        }
    });

    updateSelectedCount();
}

/** 移動ボタン */
function bindMoveListeners(container: Element, callbacks: TreeCallbacks): void {
    const moveButtons = container.querySelectorAll('.move-btn');
    moveButtons.forEach(button => {
        const btnElement = button as HTMLButtonElement;
        const itemId = btnElement.getAttribute('data-item-id');
        if (itemId && callbacks.onMove) {
            btnElement.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                callbacks.onMove!(itemId);
            });
        }
    });
}

// ---------------------------------------------------------------------------
// ダウンロード処理
// ---------------------------------------------------------------------------

async function downloadSelectedFiles(
    checkboxes: HTMLInputElement[],
    progressButton?: HTMLButtonElement
): Promise<void> {
    const allFiles = checkboxes
        .map(cb => ({
            url: cb.getAttribute('data-url'),
            filename: cb.getAttribute('data-filename'),
            webLinkUrl: cb.getAttribute('data-weblink-url') || undefined
        }))
        .filter((file): file is { url: string; filename: string; webLinkUrl: string | undefined } =>
            file.url !== null && file.filename !== null
        );

    if (allFiles.length === 0) {
        throw new Error('ダウンロード可能なファイルが見つかりません。');
    }

    if (allFiles.length > 50) {
        const proceed = confirm(`${allFiles.length}件のファイルをダウンロードします。メモリ使用量が大きくなる可能性があります。続行しますか？`);
        if (!proceed) return;
    }

    const nussFiles = allFiles.filter(f => isNussLink(f.url));
    const zipFiles = allFiles.filter(f => !isNussLink(f.url));
    const failedFiles: string[] = [];
    const nussFailedFiles: Array<{ url: string; filename: string; webLinkUrl: string | undefined }> = [];

    const zip = new JSZip();

    // 通常ファイル
    if (zipFiles.length > 0) {
        const total = zipFiles.length;
        for (let i = 0; i < total; i++) {
            const file = zipFiles[i];
            if (progressButton) {
                progressButton.textContent = `ダウンロード中... (${i + 1}/${total})`;
            }
            try {
                const response = await fetch(file.url, { method: 'GET', credentials: 'include' });
                if (!response.ok) throw new Error(`HTTP エラー: ${response.status}`);
                const blob = await response.blob();
                zip.file(file.filename, blob);
            } catch (error) {
                logger.error(`ファイル ${file.filename} のZIP追加に失敗:`, error);
                failedFiles.push(file.filename);
            }
        }
    }

    // NUSS ファイル（background 経由）
    if (nussFiles.length > 0) {
        for (let i = 0; i < nussFiles.length; i++) {
            const nussFile = nussFiles[i];
            if (progressButton) {
                progressButton.textContent = `NUSS取得中... (${i + 1}/${nussFiles.length})`;
            }
            try {
                const webLinkUrl = nussFile.webLinkUrl;
                if (!webLinkUrl) throw new Error('webLinkUrl not found');
                const downloadUrl = webLinkUrl + '/download';
                const response = await new Promise<{ success: boolean; data?: string; error?: string }>((resolve) => {
                    chrome.runtime.sendMessage(
                        { type: 'FETCH_NUSS_FILE', downloadUrl, filename: nussFile.filename },
                        (resp) => {
                            if (chrome.runtime.lastError) {
                                resolve({ success: false, error: chrome.runtime.lastError.message });
                            } else {
                                resolve(resp);
                            }
                        }
                    );
                });
                if (!response || !response.success) {
                    throw new Error(response ? response.error : 'No response from background');
                }
                const binary = atob(response.data!);
                const bytes = new Uint8Array(binary.length);
                for (let j = 0; j < binary.length; j++) {
                    bytes[j] = binary.charCodeAt(j);
                }
                zip.file(nussFile.filename, bytes);
            } catch (error) {
                logger.error(`NUSSファイル ${nussFile.filename} の取得に失敗:`, error);
                nussFailedFiles.push(nussFile);
            }
        }
    }

    // ZIP 生成 + ダウンロード
    const zipFileCount = Object.keys(zip.files).length;
    if (zipFileCount > 0) {
        const now = new Date();
        const dateStr =
            String(now.getFullYear()) +
            String(now.getMonth() + 1).padStart(2, '0') +
            String(now.getDate()).padStart(2, '0');
        const zipFilename = `tact-files-${dateStr}.zip`;

        if (progressButton) progressButton.textContent = 'ZIP生成中...';

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const url = window.URL.createObjectURL(zipBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = zipFilename;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    }

    // NUSS 失敗分はフォールバック
    if (nussFailedFiles.length > 0) {
        alert(
            `${nussFailedFiles.length}件のNUSSファイルを自動取得できませんでした。\n` +
            `個別に開きます:\n` +
            nussFailedFiles.map(f => `・${f.filename}`).join('\n')
        );
        for (const nussFile of nussFailedFiles) {
            const message = `NUSSファイル「${nussFile.filename}」は現在ダウンロードできません。\n\nブラウザの別タブでNUSSサイトを開きます。`;
            if (confirm(message)) {
                window.open(nussFile.url, '_blank');
            }
        }
    }

    // 結果通知
    const successCount = zipFiles.length - failedFiles.length;
    if (failedFiles.length > 0) {
        alert(
            `ダウンロード完了: ${successCount}件成功, ${failedFiles.length}件失敗\n` +
            `失敗したファイル:\n` +
            failedFiles.map(n => `・${n}`).join('\n')
        );
    }
}
