/**
 * 全教科横断フォルダブラウザ
 * 全コースのファイルツリーを一望できるモーダルUI
 */

import { TactApiClient } from '../tact/tact-api';
import { CrossFolderNode, CrossFolderCache, SearchResult } from './types';
import { classifySemester, semesterSortKey } from './semesterClassifier';

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------
const CACHE_KEY = 'cross-folder-cache';
const CACHE_TIME_KEY = 'cross-folder-cache-time';
/** キャッシュ有効期間: 2時間 */
const CACHE_TTL_MS = 2 * 60 * 60 * 1000;
const BASE_URL = 'https://tact.ac.thers.ac.jp';

// ---------------------------------------------------------------------------
// キャッシュ管理
// ---------------------------------------------------------------------------

function loadCache(): CrossFolderCache | null {
    try {
        const raw = localStorage.getItem(CACHE_KEY);
        const time = localStorage.getItem(CACHE_TIME_KEY);
        if (!raw || !time) return null;
        const age = Date.now() - Number(time);
        if (age > CACHE_TTL_MS) return null;
        return JSON.parse(raw) as CrossFolderCache;
    } catch {
        return null;
    }
}

function saveCache(tree: CrossFolderNode[]): void {
    try {
        const cache: CrossFolderCache = { tree, generatedAt: Date.now() };
        localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
        localStorage.setItem(CACHE_TIME_KEY, String(Date.now()));
    } catch {
        // quota exceeded などは無視
    }
}

// ---------------------------------------------------------------------------
// コース一覧取得
// ---------------------------------------------------------------------------

interface CourseEntry {
    id: string;
    title: string;
}

async function fetchAllCourses(): Promise<CourseEntry[]> {
    try {
        const response = await fetch(`${BASE_URL}/direct/site.json?_limit=500`, {
            credentials: 'include',
            headers: { Accept: 'application/json' },
        });
        if (!response.ok) throw new Error(`site list HTTP ${response.status}`);
        const data = await response.json();
        const sites: any[] = data.site_collection || [];
        return sites.map((s: any) => ({ id: s.id as string, title: (s.title || s.id) as string }));
    } catch (e) {
        console.error('[CrossFolderBrowser] fetchAllCourses failed:', e);
        return [];
    }
}

// ---------------------------------------------------------------------------
// Content API からファイルツリーを構築
// ---------------------------------------------------------------------------

interface RawContentItem {
    title?: string;
    name?: string;
    type?: string;
    container?: string;
    url?: string;
    webLinkUrl?: string;
    numChildren?: number;
}

function buildCourseTree(items: RawContentItem[]): CrossFolderNode[] {
    const nodeMap: { [path: string]: CrossFolderNode } = {};

    const getOrCreateFolder = (path: string): CrossFolderNode => {
        if (nodeMap[path]) return nodeMap[path];
        const parts = path.split('/').filter(Boolean);
        const name = parts[parts.length - 1] || path;
        const node: CrossFolderNode = { name, type: 'folder', children: [] };
        nodeMap[path] = node;
        if (parts.length > 1) {
            const parentPath = '/' + parts.slice(0, -1).join('/');
            const parent = getOrCreateFolder(parentPath);
            if (!parent.children) parent.children = [];
            if (!parent.children.find(c => c.name === node.name)) {
                parent.children.push(node);
            }
        }
        return node;
    };

    const roots: CrossFolderNode[] = [];

    items.forEach((item) => {
        const container = (item.container || '/').replace(/\/$/, '') || '/';
        const itemName = item.title || item.name || 'Unnamed';
        const isFolder = item.type === 'collection';

        const node: CrossFolderNode = {
            name: itemName,
            type: isFolder ? 'folder' : 'file',
            children: isFolder ? [] : undefined,
            url: isFolder ? undefined : item.url,
            webLinkUrl: isFolder ? undefined : item.webLinkUrl,
        };

        if (container === '/') {
            roots.push(node);
        } else {
            const parent = getOrCreateFolder(container);
            if (!parent.children) parent.children = [];
            parent.children.push(node);
        }
    });

    Object.entries(nodeMap).forEach(([path, node]) => {
        const depth = path.split('/').filter(Boolean).length;
        if (depth === 1 && !roots.find(r => r.name === node.name)) {
            roots.push(node);
        }
    });

    return roots;
}

async function fetchCourseTree(siteId: string): Promise<CrossFolderNode[]> {
    const cacheKey = `tact-file-system-${siteId}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
        try {
            const data = JSON.parse(cached);
            if (data && typeof data === 'object' && !Array.isArray(data)) {
                const client = new TactApiClient();
                (client as any)['fileStorage'].setSiteId(siteId);
                const tree = client.buildFileTreeFromStorage();
                if (tree.children && tree.children.length > 0) {
                    return tree.children.map(mapFolderTreeNode);
                }
            }
        } catch {
            // ignore
        }
    }

    try {
        const response = await fetch(`${BASE_URL}/direct/content/site/${siteId}.json`, {
            credentials: 'include',
            headers: { Accept: 'application/json' },
        });
        if (!response.ok) return [];
        const data = await response.json();
        const items: RawContentItem[] = data.content_collection || [];
        return buildCourseTree(items);
    } catch {
        return [];
    }
}

function mapFolderTreeNode(node: any): CrossFolderNode {
    return {
        name: node.name,
        type: node.type === 'folder' ? 'folder' : 'file',
        children: node.children ? node.children.map(mapFolderTreeNode) : undefined,
        url: node.url,
        webLinkUrl: node.webLinkUrl,
    };
}

// ---------------------------------------------------------------------------
// ツリー全体の構築（学期 > 教科 > ファイル）
// ---------------------------------------------------------------------------

async function buildFullTree(forceRefresh: boolean = false): Promise<CrossFolderNode[]> {
    if (!forceRefresh) {
        const cache = loadCache();
        if (cache) return cache.tree;
    }

    const courses = await fetchAllCourses();
    if (courses.length === 0) return [];

    const results = await Promise.allSettled(
        courses.map(async (course) => {
            const children = await fetchCourseTree(course.id);
            return { course, children };
        })
    );

    const semesterMap: { [label: string]: CrossFolderNode[] } = {};

    results.forEach((result) => {
        if (result.status !== 'fulfilled') return;
        const { course, children } = result.value;
        if (children.length === 0) return;

        const label = classifySemester(course.title);
        if (!semesterMap[label]) semesterMap[label] = [];

        const courseNode: CrossFolderNode = {
            name: course.title,
            type: 'course',
            children,
            semesterLabel: label,
        };
        semesterMap[label].push(courseNode);
    });

    const tree: CrossFolderNode[] = Object.entries(semesterMap)
        .sort(([a], [b]) => semesterSortKey(a).localeCompare(semesterSortKey(b)))
        .map(([label, courseNodes]) => ({
            name: label,
            type: 'semester' as const,
            children: courseNodes,
        }));

    saveCache(tree);
    return tree;
}

// ---------------------------------------------------------------------------
// 検索
// ---------------------------------------------------------------------------

function escapeRegExp(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function escapeHtml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function highlightMatch(text: string, query: string): string {
    if (!query) return escapeHtml(text);
    const escaped = escapeRegExp(query);
    const re = new RegExp('(' + escaped + ')', 'gi');
    return escapeHtml(text).replace(re, '<mark>$1</mark>');
}

function searchTree(nodes: CrossFolderNode[], query: string, pathParts: string[] = []): SearchResult[] {
    const results: SearchResult[] = [];
    const lowerQuery = query.toLowerCase();

    nodes.forEach((node) => {
        const currentPath = [...pathParts, node.name];

        if (node.type === 'file' || node.type === 'folder') {
            if (node.name.toLowerCase().includes(lowerQuery)) {
                results.push({
                    node,
                    highlightedName: highlightMatch(node.name, query),
                    displayPath: currentPath.join(' / '),
                });
            }
        }

        if (node.children && node.children.length > 0) {
            const childResults = searchTree(node.children, query, currentPath);
            results.push(...childResults);
        }
    });

    return results;
}

// ---------------------------------------------------------------------------
// DOM ツリー描画
// ---------------------------------------------------------------------------

function createTreeNode(node: CrossFolderNode, depth: number = 0): HTMLElement {
    const item = document.createElement('div');
    item.className = 'cfb-tree-item';
    item.style.paddingLeft = depth * 16 + 'px';

    if (node.type === 'file') {
        const link = document.createElement('a');
        link.className = 'cfb-file-link';
        link.href = node.webLinkUrl || node.url || '#';
        link.target = '_blank';
        link.rel = 'noopener noreferrer';

        const iconEl = document.createElement('span');
        iconEl.className = 'cfb-icon cfb-icon-file';
        iconEl.textContent = '\uD83D\uDCC4'; // 📄

        const nameEl = document.createElement('span');
        nameEl.className = 'cfb-item-name';
        nameEl.textContent = node.name;

        link.appendChild(iconEl);
        link.appendChild(nameEl);

        if (node.isNew) {
            const badge = document.createElement('span');
            badge.className = 'cfb-badge-new';
            badge.textContent = 'NEW';
            link.appendChild(badge);
        }
        item.appendChild(link);
    } else {
        const toggle = document.createElement('button');
        toggle.className = 'cfb-folder-toggle';

        const arrow = document.createElement('span');
        arrow.className = 'cfb-arrow cfb-arrow-closed';
        arrow.textContent = '\u25BA'; // ▶

        const iconEl = document.createElement('span');
        const iconClass = node.type === 'semester' ? 'cfb-icon-semester' :
                          node.type === 'course'   ? 'cfb-icon-course'   : 'cfb-icon-folder';
        iconEl.className = 'cfb-icon ' + iconClass;
        iconEl.textContent = node.type === 'semester' ? '\uD83D\uDCC5' : // 📅
                              node.type === 'course'   ? '\uD83D\uDCDA' : // 📚
                                                         '\uD83D\uDCC1'; // 📁

        const nameEl = document.createElement('span');
        nameEl.className = 'cfb-item-name';
        nameEl.textContent = node.name;

        toggle.appendChild(arrow);
        toggle.appendChild(iconEl);
        toggle.appendChild(nameEl);
        item.appendChild(toggle);

        const childContainer = document.createElement('div');
        childContainer.className = 'cfb-children cfb-children-hidden';
        item.appendChild(childContainer);

        let built = false;
        toggle.addEventListener('click', () => {
            if (childContainer.classList.contains('cfb-children-hidden')) {
                childContainer.classList.remove('cfb-children-hidden');
                arrow.classList.remove('cfb-arrow-closed');
                arrow.classList.add('cfb-arrow-open');
                arrow.textContent = '\u25BC'; // ▼
                if (!built) {
                    built = true;
                    (node.children || []).forEach(child => {
                        childContainer.appendChild(createTreeNode(child, depth + 1));
                    });
                }
            } else {
                childContainer.classList.add('cfb-children-hidden');
                arrow.classList.remove('cfb-arrow-open');
                arrow.classList.add('cfb-arrow-closed');
                arrow.textContent = '\u25BA'; // ▶
            }
        });
    }

    return item;
}

// ---------------------------------------------------------------------------
// 検索結果の DOM 描画
// ---------------------------------------------------------------------------

function renderSearchResults(results: SearchResult[], container: HTMLElement): void {
    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }

    if (results.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'cfb-empty';
        empty.textContent = '一致するファイル・フォルダが見つかりませんでした。';
        container.appendChild(empty);
        return;
    }

    results.forEach(result => {
        const row = document.createElement('div');
        row.className = 'cfb-search-result';

        const pathWithoutLeaf = result.displayPath.slice(0, result.displayPath.lastIndexOf(result.node.name)).replace(/\s*\/\s*$/, '');

        if (result.node.type === 'file') {
            const link = document.createElement('a');
            link.className = 'cfb-file-link';
            link.href = result.node.webLinkUrl || result.node.url || '#';
            link.target = '_blank';
            link.rel = 'noopener noreferrer';

            const iconEl = document.createElement('span');
            iconEl.className = 'cfb-icon';
            iconEl.textContent = '\uD83D\uDCC4';

            const nameEl = document.createElement('span');
            nameEl.className = 'cfb-item-name';
            // highlightedName は escapeHtml 済み HTML
            nameEl.innerHTML = result.highlightedName;

            link.appendChild(iconEl);
            link.appendChild(nameEl);

            if (result.node.isNew) {
                const badge = document.createElement('span');
                badge.className = 'cfb-badge-new';
                badge.textContent = 'NEW';
                link.appendChild(badge);
            }

            const pathEl = document.createElement('span');
            pathEl.className = 'cfb-search-path';
            pathEl.textContent = pathWithoutLeaf;

            row.appendChild(link);
            row.appendChild(pathEl);
        } else {
            const iconEl = document.createElement('span');
            iconEl.className = 'cfb-icon';
            iconEl.textContent = '\uD83D\uDCC1';

            const nameEl = document.createElement('span');
            nameEl.className = 'cfb-item-name';
            nameEl.innerHTML = result.highlightedName;

            const pathEl = document.createElement('span');
            pathEl.className = 'cfb-search-path';
            pathEl.textContent = pathWithoutLeaf;

            row.appendChild(iconEl);
            row.appendChild(nameEl);
            row.appendChild(pathEl);
        }

        container.appendChild(row);
    });
}

// ---------------------------------------------------------------------------
// モーダル表示
// ---------------------------------------------------------------------------

let modalOverlay: HTMLElement | null = null;

export function showCrossFolderBrowser(): void {
    if (modalOverlay) {
        modalOverlay.remove();
        modalOverlay = null;
        return;
    }

    const overlay = document.createElement('div');
    overlay.id = 'cfb-overlay';
    overlay.className = 'cfb-overlay';
    modalOverlay = overlay;

    const modal = document.createElement('div');
    modal.className = 'cfb-modal';

    // ヘッダー
    const header = document.createElement('div');
    header.className = 'cfb-header';

    const title = document.createElement('span');
    title.className = 'cfb-title';
    title.textContent = 'フォルダブラウザ';

    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.className = 'cfb-search-input';
    searchInput.placeholder = 'ファイル・フォルダを検索...';
    searchInput.setAttribute('aria-label', 'フォルダ検索');

    const closeBtn = document.createElement('button');
    closeBtn.className = 'cfb-close-btn';
    closeBtn.textContent = '\u00D7'; // ×
    closeBtn.setAttribute('aria-label', '閉じる');

    header.appendChild(title);
    header.appendChild(searchInput);
    header.appendChild(closeBtn);

    // ツールバー
    const toolbar = document.createElement('div');
    toolbar.className = 'cfb-toolbar';

    const refreshBtn = document.createElement('button');
    refreshBtn.className = 'cfb-refresh-btn';
    refreshBtn.textContent = '再読み込み';

    const statusText = document.createElement('span');
    statusText.className = 'cfb-status';

    toolbar.appendChild(refreshBtn);
    toolbar.appendChild(statusText);

    // コンテンツエリア
    const body = document.createElement('div');
    body.className = 'cfb-body';

    const treeContainer = document.createElement('div');
    treeContainer.className = 'cfb-tree-container';
    treeContainer.id = 'cfb-tree-container';

    const searchContainer = document.createElement('div');
    searchContainer.className = 'cfb-search-container cfb-hidden';
    searchContainer.id = 'cfb-search-container';

    body.appendChild(treeContainer);
    body.appendChild(searchContainer);

    modal.appendChild(header);
    modal.appendChild(toolbar);
    modal.appendChild(body);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // ローディング
    const loadingEl = document.createElement('p');
    loadingEl.className = 'cfb-loading';
    loadingEl.textContent = '読み込み中...';
    treeContainer.appendChild(loadingEl);
    statusText.textContent = 'データを取得しています...';

    let currentTree: CrossFolderNode[] = [];

    const renderTree = (tree: CrossFolderNode[]): void => {
        currentTree = tree;
        while (treeContainer.firstChild) {
            treeContainer.removeChild(treeContainer.firstChild);
        }
        statusText.textContent = countCourses(tree) + ' コース読み込み済み';

        if (tree.length === 0) {
            const emptyEl = document.createElement('p');
            emptyEl.className = 'cfb-empty';
            emptyEl.textContent = 'コース情報を取得できませんでした。';
            treeContainer.appendChild(emptyEl);
            return;
        }

        tree.forEach(node => {
            treeContainer.appendChild(createTreeNode(node, 0));
        });

        const timeStr = localStorage.getItem(CACHE_TIME_KEY);
        if (timeStr) {
            const d = new Date(Number(timeStr));
            statusText.textContent += '  (' + d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0') + ' キャッシュ)';
        }
    };

    buildFullTree(false).then(renderTree).catch(() => {
        while (treeContainer.firstChild) {
            treeContainer.removeChild(treeContainer.firstChild);
        }
        const errEl = document.createElement('p');
        errEl.className = 'cfb-error';
        errEl.textContent = 'データの取得に失敗しました。ページをリロードしてください。';
        treeContainer.appendChild(errEl);
        statusText.textContent = 'エラー';
    });

    // 検索（デバウンス 300ms）
    let searchTimer: ReturnType<typeof setTimeout> | null = null;
    searchInput.addEventListener('input', () => {
        if (searchTimer) clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
            const query = searchInput.value.trim();
            if (query.length === 0) {
                treeContainer.classList.remove('cfb-hidden');
                searchContainer.classList.add('cfb-hidden');
            } else {
                const results = searchTree(currentTree, query);
                renderSearchResults(results, searchContainer);
                treeContainer.classList.add('cfb-hidden');
                searchContainer.classList.remove('cfb-hidden');
            }
        }, 300);
    });

    // 再読み込み
    refreshBtn.addEventListener('click', () => {
        while (treeContainer.firstChild) {
            treeContainer.removeChild(treeContainer.firstChild);
        }
        const loadingEl2 = document.createElement('p');
        loadingEl2.className = 'cfb-loading';
        loadingEl2.textContent = '再読み込み中...';
        treeContainer.appendChild(loadingEl2);
        treeContainer.classList.remove('cfb-hidden');
        searchContainer.classList.add('cfb-hidden');
        searchInput.value = '';
        statusText.textContent = 'データを取得しています...';

        buildFullTree(true).then(renderTree).catch(() => {
            while (treeContainer.firstChild) {
                treeContainer.removeChild(treeContainer.firstChild);
            }
            const errEl2 = document.createElement('p');
            errEl2.className = 'cfb-error';
            errEl2.textContent = 'データの取得に失敗しました。';
            treeContainer.appendChild(errEl2);
            statusText.textContent = 'エラー';
        });
    });

    // 閉じる
    const closeModal = (): void => {
        overlay.remove();
        modalOverlay = null;
    };

    closeBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal();
    });
    document.addEventListener('keydown', function onKeyDown(e: KeyboardEvent) {
        if (e.key === 'Escape') {
            closeModal();
            document.removeEventListener('keydown', onKeyDown);
        }
    });
}

// ---------------------------------------------------------------------------
// ユーティリティ
// ---------------------------------------------------------------------------

function countCourses(tree: CrossFolderNode[]): number {
    let count = 0;
    tree.forEach(semester => {
        count += (semester.children || []).length;
    });
    return count;
}
