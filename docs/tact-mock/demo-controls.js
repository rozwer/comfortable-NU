/**
 * demo-controls.js — デモ用フローティングコントロールパネル
 *
 * 拡張機能の ON/OFF トグルと年度・学期の切り替えを提供する。
 * demo-data.js, demo-shim.js の後に読み込む。
 */

(function () {
  'use strict';

  // ===== Configuration =====
  // _demoBasePath は demo-shim.js で URL 書き換え前に保存済み
  const BASE = window._demoBasePath || '';
  const EXT_CSS_FILES = [
    BASE + 'ext/css/comfortable-sakai.css',
    BASE + 'ext/css/tact-extension.css',
    BASE + 'ext/css/date-picker.css',
    BASE + 'ext/css/material-dialog.css',
    BASE + 'ext/css/minus-button.css',
    BASE + 'ext/css/submission-tracker.css',
    BASE + 'ext/css/calendar-sync.css',
    BASE + 'ext/css/memo-styles.css',
    BASE + 'ext/css/submitted-styles.css'
  ];

  const EXT_SCRIPT = BASE + 'ext/content_script.js';

  // ===== State =====
  let isExtensionOn = false;
  // 日本の学年度は4月開始: 1〜3月はまだ前年度
  const now = new Date();
  let currentYear = String(now.getMonth() < 3 ? now.getFullYear() - 1 : now.getFullYear());
  let currentTerm = (now.getMonth() >= 3 && now.getMonth() <= 8) ? '春' : '秋';
  let loadedScripts = [];
  let loadedStyles = [];

  // ===== Build Control Panel =====
  function createControlPanel() {
    const panel = document.createElement('div');
    panel.className = 'demo-controls';
    panel.setAttribute('data-demo-active', 'true');

    // Header with collapse
    const header = document.createElement('div');
    header.className = 'demo-controls__header';

    const title = document.createElement('span');
    title.className = 'demo-controls__title';
    title.textContent = 'Comfortable NU Demo';

    const collapseBtn = document.createElement('button');
    collapseBtn.className = 'demo-controls__collapse-btn';
    collapseBtn.setAttribute('data-demo-active', 'true');
    collapseBtn.textContent = '−';
    collapseBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      panel.classList.toggle('collapsed');
      collapseBtn.textContent = panel.classList.contains('collapsed') ? '+' : '−';
    });

    header.appendChild(title);
    header.appendChild(collapseBtn);

    // Body
    const body = document.createElement('div');
    body.className = 'demo-controls__body';

    // 1. Extension toggle
    const toggleSection = createSection('拡張機能');
    const toggle = createToggle();
    toggleSection.appendChild(toggle);
    body.appendChild(toggleSection);

    // 年度・学期は自動検出（currentYear / currentTerm）のため手動切替UIは不要

    // Status line
    const status = document.createElement('div');
    status.className = 'demo-controls__status';
    status.id = 'demo-status';
    status.textContent = 'トグルをONにして拡張機能を体験';
    body.appendChild(status);

    panel.appendChild(header);
    panel.appendChild(body);

    document.body.appendChild(panel);
    return panel;
  }

  function createSection(labelText) {
    const section = document.createElement('div');
    section.className = 'demo-controls__section';
    const label = document.createElement('span');
    label.className = 'demo-controls__label';
    label.textContent = labelText;
    section.appendChild(label);
    return section;
  }

  function createToggle() {
    const container = document.createElement('div');
    container.className = 'demo-toggle';

    const sw = document.createElement('div');
    sw.className = 'demo-toggle__switch';
    sw.setAttribute('data-demo-active', 'true');

    const statusText = document.createElement('span');
    statusText.className = 'demo-toggle__status';
    statusText.textContent = 'OFF';

    sw.addEventListener('click', function () {
      if (isExtensionOn) {
        turnOff();
        sw.classList.remove('active');
        statusText.textContent = 'OFF';
      } else {
        turnOn();
        sw.classList.add('active');
        statusText.textContent = 'ON';
      }
    });

    container.appendChild(sw);
    container.appendChild(statusText);
    return container;
  }

  // ===== Demo Link Interceptor =====
  // /portal/site/{courseId} への実ナビゲーションを防ぎ、URL書き換えのみ行う
  function demoLinkInterceptor(e) {
    var href = e.currentTarget.href || '';
    if (href.indexOf('/portal/site/') !== -1) {
      e.preventDefault();
      e.stopPropagation();
      try {
        var url = new URL(href);
        history.replaceState(null, '', url.pathname);
        console.log('[Demo Controls] Intercepted navigation, URL updated to', url.pathname);
      } catch (err) {
        console.warn('[Demo Controls] Link intercept failed:', err);
      }
    }
  }

  // ===== Demo Data Patching =====

  /**
   * コース名の年度・学期部分を現在の設定に書き換える。
   * 例: "アルゴリズムとデータ構造(2025年度春/金1限)" → "アルゴリズムとデータ構造(2025年度秋/金1限)"
   * DEMO_DATA のキーは年度のまま（"2025"）で、name と term だけ動的に変える。
   */
  function patchCourseNamesForTerm(year, term) {
    const data = window.DEMO_DATA[year];
    if (!data) return;

    data.term = term;

    // コース名の (XXXX年度YY/ 部分を書き換え
    (data.courses || []).forEach(function (course) {
      course.name = course.name.replace(
        /\((\d{4})年度[春秋]\//,
        '(' + year + '年度' + term + '/'
      );
    });

    console.log('[Demo Controls] Patched course names for', year, term);
  }

  // ===== Extension Control =====

  function turnOn() {
    console.log('[Demo Controls] Turning extension ON for year:', currentYear, 'term:', currentTerm);
    isExtensionOn = true;

    // 0. Clear stale storage from previous sessions
    chrome.storage.local.clear();
    localStorage.removeItem('tact-lecture-notes');
    localStorage.removeItem('tact-lecture-links');

    // 1. Update demo state
    window.DEMO_STATE.year = currentYear;
    window.DEMO_STATE.term = currentTerm;
    window.DEMO_STATE.extensionEnabled = true;

    // 2. Patch course names to reflect current year/term
    patchCourseNamesForTerm(currentYear, currentTerm);

    // 3. Seed chrome.storage.local with data for current year
    seedStorageData(currentYear);

    // 3. Update portal variables
    updatePortal(currentYear);

    // 4. Update course tabs in the page
    updateCourseTabs(currentYear);

    // 5. Update fav-sites-entry links for fetchCourse()
    updateFavSitesLinks(currentYear);

    // 6. URL を /portal パスに書き換え（拡張機能の getBaseURL() 互換）
    if (window._demoRewriteURL) window._demoRewriteURL();

    // 7. Load extension CSS
    loadExtensionCSS();

    // 8. Load extension script
    loadExtensionScript();

    updateStatus('拡張機能 ON - ' + currentYear + '年度');
  }

  function turnOff() {
    console.log('[Demo Controls] Turning extension OFF');
    isExtensionOn = false;
    window.DEMO_STATE.extensionEnabled = false;

    // URL を元に戻す（リロード時に404にならないように）
    if (window._demoRestoreURL) window._demoRestoreURL();

    // 1. Remove extension-injected DOM elements
    removeExtensionDOM();

    // 2. Remove loaded scripts and styles
    removeExtensionAssets();

    // 3. Clear chrome.storage and demo memos
    chrome.storage.local.clear();
    localStorage.removeItem('tact-lecture-notes');
    localStorage.removeItem('tact-lecture-links');

    updateStatus('トグルをONにして拡張機能を体験');
  }

  // ===== Data Seeding =====

  function seedStorageData(year) {
    const data = window.DEMO_DATA[year];
    if (!data) {
      console.error('[Demo Controls] No data for year:', year);
      return;
    }

    // Store courses
    const courses = data.courses.map(function (c) {
      return { id: c.id, name: c.name };
    });
    // 時間割設定を hostname キー配下にシード（fromStorage が hostname[key] で読む）
    const hostname = window.location.hostname;
    const termEnglish = currentTerm === '秋' ? 'fall' : 'spring';
    const hostnameData = {};
    hostnameData['TimetableYear'] = year;
    hostnameData['TimetableTerm'] = termEnglish;

    chrome.storage.local.set({
      courses: courses,
      currentYear: year,
      currentTerm: data.term,
      [hostname]: hostnameData
    });

    // メモのデモデータを localStorage に投入
    // MemoManager は localStorage.getItem('tact-lecture-notes') を直接使う
    seedDemoMemos(data);
  }

  function seedDemoMemos(data) {
    if (!data || !data.courses || data.courses.length === 0) return;

    var now = new Date();
    var weekAgo = new Date(now.getTime() - 7 * 24 * 3600000);
    var threeDaysAgo = new Date(now.getTime() - 3 * 24 * 3600000);
    var yesterday = new Date(now.getTime() - 24 * 3600000);

    var memos = [];
    var c0 = data.courses[0]; // アルゴリズムとデータ構造
    var c1 = data.courses.length > 1 ? data.courses[1] : null;
    var c2 = data.courses.length > 2 ? data.courses[2] : null;

    memos.push({
      id: 'note_demo_001',
      lectureId: c0.id,
      lectureName: c0.shortName || c0.name,
      note: '第5回: 二分探索木の挿入・削除の計算量は平均 O(log n)。最悪ケース（偏り木）では O(n) になるため、AVL木やRed-Black木で平衡を保つ。',
      links: [
        { id: 'link_demo_001', url: 'https://visualgo.net/en/bst', title: 'VisuAlgo - BST Visualization', description: '二分探索木の操作を視覚的に学べるサイト' }
      ],
      createdAt: weekAgo.toISOString(),
      updatedAt: weekAgo.toISOString()
    });

    memos.push({
      id: 'note_demo_002',
      lectureId: c0.id,
      lectureName: c0.shortName || c0.name,
      note: '第6回: ハッシュテーブル — チェイン法 vs オープンアドレス法。負荷率 α が大きくなると性能劣化。リハッシュのタイミングが重要。',
      links: [],
      createdAt: threeDaysAgo.toISOString(),
      updatedAt: threeDaysAgo.toISOString()
    });

    if (c1) {
      memos.push({
        id: 'note_demo_003',
        lectureId: c1.id,
        lectureName: c1.shortName || c1.name,
        note: '真空中の電子ビーム偏向: 電界偏向と磁界偏向の比較。CRTの原理。偏向感度の導出を復習すること。',
        links: [
          { id: 'link_demo_002', url: 'https://example.com/vacuum-electronics', title: '電子ビーム偏向の基礎' }
        ],
        createdAt: threeDaysAgo.toISOString(),
        updatedAt: yesterday.toISOString()
      });
    }

    if (c2) {
      memos.push({
        id: 'note_demo_004',
        lectureId: c2.id,
        lectureName: c2.shortName || c2.name,
        note: 'PID制御のチューニング: Ziegler-Nichols法の手順。まずP制御のみで限界ゲインKuと振動周期Tuを求め、そこからKp, Ki, Kdを算出する。',
        links: [],
        createdAt: yesterday.toISOString(),
        updatedAt: yesterday.toISOString()
      });
    }

    localStorage.setItem('tact-lecture-notes', JSON.stringify(memos));
    console.log('[Demo Controls] Seeded', memos.length, 'demo memos');
  }

  // ===== Fav-Sites Links Update =====

  function updateFavSitesLinks(year) {
    const data = window.DEMO_DATA[year];
    if (!data) return;

    // ページ内の全 fav-sites-entry を削除（my-workspace は残す）
    // HTMLテンプレートには複数の ul に跨ってエントリが存在するため、
    // 特定コンテナではなくドキュメント全体から削除する。
    document.querySelectorAll('.fav-sites-entry:not(.my-workspace)').forEach(function (el) {
      el.remove();
    });

    // 追加先コンテナを取得（最初の favoriteSiteList）
    const container = document.querySelector('.favoriteSiteList');
    if (!container) {
      console.warn('[Demo Controls] fav-sites-entry container not found');
      return;
    }

    // 現在年度のコースで再生成（fetchCourse が読み取れるポータルURL形式）
    const origin = window.location.origin;
    data.courses.forEach(function (course) {
      const li = document.createElement('li');
      li.className = 'fav-sites-entry';

      const favBtn = document.createElement('button');
      favBtn.setAttribute('data-site-id', course.id);
      favBtn.className = 'site-favorite-btn only-icon-btn';
      favBtn.title = course.name;

      const titleDiv = document.createElement('div');
      titleDiv.className = 'fav-title';

      const link = document.createElement('a');
      link.href = origin + '/portal/site/' + course.id;
      link.title = course.name;
      link.addEventListener('click', demoLinkInterceptor);

      const span = document.createElement('span');
      span.className = 'fullTitle';
      span.textContent = course.name;

      link.appendChild(span);
      // 元のSakai HTMLでは fav-title 内に改行テキストノード + <a> の順。
      // getSiteIdAndHrefSiteNameMap() が childNodes[1] を参照するため合わせる。
      titleDiv.appendChild(document.createTextNode('\n'));
      titleDiv.appendChild(link);
      li.appendChild(favBtn);
      li.appendChild(titleDiv);
      container.appendChild(li);
    });

    console.log('[Demo Controls] Updated fav-sites-entry with', data.courses.length, 'courses');
  }

  // ===== Portal & DOM Updates =====

  function updatePortal(year) {
    const data = window.DEMO_DATA[year];
    if (!data || !data.courses.length) return;

    const firstCourse = data.courses[0];
    window.portal.siteId = firstCourse.id;
    window.portal.siteTitle = firstCourse.name;
  }

  function updateCourseTabs(year) {
    const data = window.DEMO_DATA[year];
    if (!data) return;

    // Find the course navigation list
    const navList = document.querySelector('.Mrphs-sitesNav__menu');
    if (!navList) {
      console.warn('[Demo Controls] Course nav not found');
      return;
    }

    // Keep the home tab (first item), remove the rest
    const items = navList.querySelectorAll('.Mrphs-sitesNav__menuitem');
    let homeItem = null;
    items.forEach(function (item, index) {
      // Keep home item (usually first, has portal icon)
      if (index === 0 && item.querySelector('.si-home, .Mrphs-sitesNav__menuitem--home')) {
        homeItem = item;
      } else if (index === 0) {
        homeItem = item; // Keep first item regardless
      } else {
        item.remove();
      }
    });

    // Generate new course tabs matching original Sakai HTML structure
    data.courses.forEach(function (course, idx) {
      const li = document.createElement('li');
      li.className = 'Mrphs-sitesNav__menuitem' + (idx === 0 ? ' is-selected' : '');

      // Fav button: <a class="Mrphs-sitesNav__favbtn fav" role="switch" aria-checked="true">
      const favBtn = document.createElement('a');
      favBtn.className = 'Mrphs-sitesNav__favbtn fav';
      favBtn.href = '#';
      favBtn.setAttribute('data-site-id', course.id);
      favBtn.setAttribute('role', 'switch');
      favBtn.setAttribute('aria-checked', 'true');
      favBtn.title = course.name + ' をお気に入りサイトに追加または削除';

      // Link: <a class="link-container" href="#" title="..."><span>コース名</span></a>
      const link = document.createElement('a');
      link.className = 'link-container';
      link.href = window.location.origin + '/portal/site/' + course.id;
      link.title = course.name;
      link.addEventListener('click', demoLinkInterceptor);

      const titleSpan = document.createElement('span');
      titleSpan.textContent = course.name;
      link.appendChild(titleSpan);

      // Dropdown: <a class="Mrphs-sitesNav__dropdown">
      const dropdown = document.createElement('a');
      dropdown.className = 'Mrphs-sitesNav__dropdown';
      dropdown.href = '#';
      dropdown.setAttribute('data-site-id', course.id);
      dropdown.setAttribute('aria-haspopup', 'true');

      li.appendChild(favBtn);
      li.appendChild(link);
      li.appendChild(dropdown);

      navList.appendChild(li);
    });
  }

  // ===== Extension Asset Loading =====

  function loadExtensionCSS() {
    EXT_CSS_FILES.forEach(function (cssPath) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = cssPath;
      link.className = 'demo-ext-css';
      document.head.appendChild(link);
      loadedStyles.push(link);
    });
  }

  function loadExtensionScript() {
    const script = document.createElement('script');
    script.src = EXT_SCRIPT;
    script.className = 'demo-ext-script';
    script.onload = function () {
      console.log('[Demo Controls] Extension script loaded');
    };
    script.onerror = function () {
      console.error('[Demo Controls] Failed to load extension script');
      updateStatus('スクリプト読み込みエラー', true);
    };
    document.body.appendChild(script);
    loadedScripts.push(script);
  }

  // ===== Cleanup =====

  function removeExtensionDOM() {
    // Remove known extension-injected elements
    const selectors = [
      '#miniSakai',
      '.cs-minisakai',
      '#cs-main-container',
      '.cs-overlay',
      '#cs-timetable',
      '#cs-memo-panel',
      '.cs-submission-tracker',
      '.cs-folder-browser',
      '.cs-sync-notification',
      '#cs-schedule-modal',
      '#cs-color-settings-modal',
      '#cs-memo-tab-content',
      '#cs-folder-tab-content',
      '[id^="cs-"]',
      '[class^="cs-"]',
      '.minisakai-btn',
      '.tact-custom-tab',
      '.tact-tab-content',
      '#miniSakaiBtn',
      // Additional TACT feature elements
      '.memo-wrapper',
      '.folder-wrapper'
    ];

    selectors.forEach(function (sel) {
      document.querySelectorAll(sel).forEach(function (el) {
        // Don't remove the demo controls panel itself
        if (!el.closest('.demo-controls')) {
          el.remove();
        }
      });
    });
  }

  function removeExtensionAssets() {
    loadedStyles.forEach(function (el) { el.remove(); });
    loadedScripts.forEach(function (el) { el.remove(); });
    loadedStyles = [];
    loadedScripts = [];
  }

  // ===== Status =====

  function updateStatus(text, isError) {
    const el = document.getElementById('demo-status');
    if (el) {
      el.textContent = text;
      el.className = 'demo-controls__status' + (isError ? ' error' : '');
    }
  }

  // ===== Initialize =====

  function initAndAutoStart() {
    createControlPanel();
    // 拡張機能をデフォルトONにする
    turnOn();
    const sw = document.querySelector('.demo-toggle__switch');
    const statusText = document.querySelector('.demo-toggle__status');
    if (sw) sw.classList.add('active');
    if (statusText) statusText.textContent = 'ON';
  }

  // Wait for DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAndAutoStart);
  } else {
    initAndAutoStart();
  }

  console.log('[Demo Controls] Initialized');
})();
