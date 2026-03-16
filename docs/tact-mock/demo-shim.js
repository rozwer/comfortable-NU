/**
 * demo-shim.js — Chrome Extension API モック層
 *
 * このファイルは demo-data.js の後、拡張機能コードの前に読み込む。
 * Chrome Extension API を localStorage ベースで再現し、
 * Sakai API への fetch 呼び出しをインターセプトしてモックデータを返す。
 */

(function () {
  'use strict';

  // ----------------------------------------------------------------
  // 0. デモモードフラグ（拡張機能コード内の分岐で使用）
  // ----------------------------------------------------------------
  window.__COMFORTABLE_NU_DEMO__ = true;

  // ----------------------------------------------------------------
  // 1. chrome.storage.local (localStorage バックエンド)
  // ----------------------------------------------------------------

  window.chrome = window.chrome || {};

  /** localStorage キーのプレフィックス（名前空間分離） */
  var STORAGE_PREFIX = '__cnu_';

  /**
   * localStorage から値を読み出す。
   * 値は JSON.parse を試みる。失敗した場合は文字列のまま返す。
   */
  function storageRead(rawKey) {
    var v = localStorage.getItem(rawKey);
    if (v === null) return undefined;
    try { return JSON.parse(v); } catch (e) { return v; }
  }

  chrome.storage = {
    _listeners: [],

    local: {
      get: function (keys, callback) {
        var result = {};

        if (keys === null || keys === undefined) {
          // 全 __cnu_ プレフィックスキーを返す
          for (var i = 0; i < localStorage.length; i++) {
            var k = localStorage.key(i);
            if (k && k.startsWith(STORAGE_PREFIX)) {
              var realKey = k.slice(STORAGE_PREFIX.length);
              var val = storageRead(k);
              if (val !== undefined) result[realKey] = val;
            }
          }
        } else if (typeof keys === 'string') {
          var v = storageRead(STORAGE_PREFIX + keys);
          if (v !== undefined) result[keys] = v;
        } else if (Array.isArray(keys)) {
          keys.forEach(function (k) {
            var v = storageRead(STORAGE_PREFIX + k);
            if (v !== undefined) result[k] = v;
          });
        } else {
          // オブジェクト: キーのデフォルト値を持つ
          Object.keys(keys).forEach(function (k) {
            var v = storageRead(STORAGE_PREFIX + k);
            result[k] = (v !== undefined) ? v : keys[k];
          });
        }

        if (callback) callback(result);
        return Promise.resolve(result);
      },

      set: function (items, callback) {
        var changes = {};
        Object.keys(items).forEach(function (k) {
          var oldRaw = localStorage.getItem(STORAGE_PREFIX + k);
          var oldParsed;
          try { oldParsed = (oldRaw !== null) ? JSON.parse(oldRaw) : undefined; }
          catch (e) { oldParsed = oldRaw; }

          localStorage.setItem(STORAGE_PREFIX + k, JSON.stringify(items[k]));
          changes[k] = { oldValue: oldParsed, newValue: items[k] };
        });

        // onChanged リスナーに通知
        chrome.storage._listeners.forEach(function (fn) {
          try { fn(changes, 'local'); } catch (e) {}
        });

        if (callback) callback();
        return Promise.resolve();
      },

      remove: function (keys, callback) {
        var keyArr = (typeof keys === 'string') ? [keys] : keys;
        keyArr.forEach(function (k) {
          localStorage.removeItem(STORAGE_PREFIX + k);
        });
        if (callback) callback();
        return Promise.resolve();
      },

      clear: function (callback) {
        var toRemove = [];
        for (var i = 0; i < localStorage.length; i++) {
          var k = localStorage.key(i);
          if (k && k.startsWith(STORAGE_PREFIX)) toRemove.push(k);
        }
        toRemove.forEach(function (k) { localStorage.removeItem(k); });
        if (callback) callback();
        return Promise.resolve();
      }
    },

    onChanged: {
      addListener: function (fn) {
        chrome.storage._listeners.push(fn);
      },
      removeListener: function (fn) {
        chrome.storage._listeners = chrome.storage._listeners.filter(function (f) {
          return f !== fn;
        });
      }
    }
  };

  // ----------------------------------------------------------------
  // 2. chrome.runtime
  // ----------------------------------------------------------------

  /**
   * 拡張機能リソースパス → デモページからの相対パス マッピング。
   * public/ ディレクトリを ../../public/ として参照する。
   */
  var RESOURCE_MAP = {
    'img/closeBtn.svg':     '/tact-mock/ext/img/closeBtn.svg',
    'img/logo.png':         '/tact-mock/ext/img/logo.png',
    'img/scheduleBtn.svg':  '/tact-mock/ext/img/scheduleBtn.svg',
    'img/favoriteBtn.svg':  '/tact-mock/ext/img/favoriteBtn.svg',
    'img/trackerBtn.svg':   '/tact-mock/ext/img/trackerBtn.svg',
    'img/folderBtn.svg':    '/tact-mock/ext/img/folderBtn.svg',
    'img/miniSakaiBtn.png': '/tact-mock/ext/img/miniSakaiBtn.png',
    'css/date-picker.css':  '/tact-mock/ext/css/date-picker.css',
    'css/memo-styles.css':  '/tact-mock/ext/css/memo-styles.css'
  };

  /** sendMessage ハンドラ定義 */
  var MESSAGE_HANDLERS = {
    authenticateGoogle: function () {
      return { success: false, error: 'Demo mode' };
    },
    syncToCalendar: function () {
      return { success: false, error: 'Demo mode' };
    },
    getGoogleAccounts: function () {
      return { success: true, accounts: [] };
    },
    logout: function () {
      return { success: true };
    },
    checkAutoSync: function () {
      return { success: true, shouldSync: false };
    },
    updateSyncInterval: function () {
      return { success: true };
    },
    setAutoSyncEnabled: function () {
      return { success: true };
    },
    updateNewFileCheckInterval: function () {
      return { success: true };
    },
    FETCH_NUSS_FILE: function () {
      return { success: false, error: 'Demo mode' };
    },
    getSakaiDataForSync: function () {
      var year = (window.DEMO_STATE ? window.DEMO_STATE.year : '2025');
      var data = (window.DEMO_DATA ? window.DEMO_DATA[year] : null);
      if (!data) return { success: true, data: { assignments: [], quizzes: [] } };
      return {
        success: true,
        data: {
          assignments: data.assignments || [],
          quizzes: []
        }
      };
    },
    checkNewFiles: function () {
      return { success: true };
    },
    syncCompleted: function () {
      return undefined; // no-op
    }
  };

  chrome.runtime = {
    lastError: null,

    getURL: function (path) {
      return RESOURCE_MAP[path] || ('/tact-mock/ext/' + path);
    },

    sendMessage: function (message, callback) {
      var action = message && message.action;
      var handler = action ? MESSAGE_HANDLERS[action] : null;
      var response = handler ? handler() : { success: false, error: 'Unknown action: ' + action };

      if (callback && response !== undefined) {
        setTimeout(function () { callback(response); }, 0);
      }
    },

    onMessage: {
      addListener: function (fn) { /* no-op for demo */ },
      removeListener: function (fn) { /* no-op */ },
      hasListener: function (fn) { return false; }
    },

    getManifest: function () {
      return { version: 'demo', name: 'Comfortable NU (Demo)' };
    }
  };

  // ----------------------------------------------------------------
  // 3. chrome.identity (スタブ)
  // ----------------------------------------------------------------

  chrome.identity = {
    getAuthToken: function (opts, callback) {
      // デモでは常に未認証
      if (callback) callback(undefined);
    },
    removeCachedAuthToken: function (opts, callback) {
      if (callback) callback();
    }
  };

  // ----------------------------------------------------------------
  // 4. chrome.i18n (日本語メッセージ対応)
  // ----------------------------------------------------------------

  // _locales/ja/messages.json を同期読み込み
  var i18nMessages = {};
  try {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', '/tact-mock/ext/_locales/ja/messages.json', false); // 同期
    xhr.send();
    if (xhr.status === 200) {
      i18nMessages = JSON.parse(xhr.responseText);
    }
  } catch (e) {
    console.warn('[Demo Shim] Failed to load i18n messages:', e);
  }

  chrome.i18n = {
    getMessage: function (key) {
      var entry = i18nMessages[key];
      if (!entry) return key;
      var msg = entry.message;
      // プレースホルダ置換: $name$ → 引数で置換
      // chrome.i18n.getMessage は第2引数に配列を受け取る（例: ["0","5","59"]）
      // Array.prototype.slice.call(arguments, 1) だと [["0","5","59"]] になるため、
      // 配列の場合は展開する
      var rawArgs = Array.prototype.slice.call(arguments, 1);
      var args = (rawArgs.length === 1 && Array.isArray(rawArgs[0])) ? rawArgs[0] : rawArgs;
      if (entry.placeholders && args.length > 0) {
        Object.keys(entry.placeholders).forEach(function (name) {
          var ph = entry.placeholders[name];
          // content: "$1" → args[0], "$2" → args[1], ...
          var idx = parseInt(ph.content.replace('$', ''), 10) - 1;
          if (idx >= 0 && idx < args.length) {
            msg = msg.replace(new RegExp('\\$' + name + '\\$', 'gi'), args[idx]);
          }
        });
      }
      return msg;
    },
    getUILanguage: function () { return 'ja'; }
  };

  // ----------------------------------------------------------------
  // 5. chrome.action / chrome.browserAction (スタブ)
  // ----------------------------------------------------------------

  chrome.action = {
    setBadgeText: function () {},
    setBadgeBackgroundColor: function () {},
    setIcon: function () {}
  };
  chrome.browserAction = chrome.action;

  // ----------------------------------------------------------------
  // 6. fetch インターセプト
  // ----------------------------------------------------------------

  var _originalFetch = window.fetch.bind(window);

  /**
   * Sakai API URL パターンにマッチしてモックレスポンスを返す。
   * マッチしない場合は null を返す（元の fetch にパススルー）。
   */
  function matchMockAPI(url) {
    var state = window.DEMO_STATE || { year: '2025' };
    var data = window.DEMO_DATA ? window.DEMO_DATA[state.year] : null;
    if (!data) return null;

    var now = Date.now();
    var m;

    // /direct/site.json — 全コース一覧
    if (url.match(/\/direct\/site\.json/)) {
      return {
        site_collection: data.courses.map(function (c) {
          return {
            id: c.id,
            title: c.name,
            type: 'course',
            shortDescription: c.description || '',
            contactName: c.instructor
          };
        })
      };
    }

    // /direct/assignment/site/{courseId}.json — コース別課題一覧
    m = url.match(/\/direct\/assignment\/site\/([^/.]+)\.json/);
    if (m) {
      var courseIdA = m[1];

      /** epoch ミリ秒 → ISO 文字列 */
      function toISO(ms) { return new Date(ms).toISOString(); }

      // 未提出・進行中の課題
      var assignments = (data.assignments || [])
        .filter(function (a) { return a.courseId === courseIdA; })
        .map(function (a) {
          var dueMs = now + (a.dueOffset ? a.dueOffset.hours * 3600000 : 0);
          var closeMs = now + (a.closeOffset ? a.closeOffset.hours * 3600000 : 0);
          var openMs = now - 86400000;
          return {
            id: a.id,
            title: a.title,
            dueTime: { epochSecond: Math.floor(dueMs / 1000) },
            dueTimeString: toISO(dueMs),
            closeTime: { epochSecond: Math.floor(closeMs / 1000) },
            closeTimeString: toISO(closeMs),
            openTime: { epochSecond: Math.floor(openMs / 1000) },
            openTimeString: toISO(openMs),
            // folder-ui は submissions.length > 0 で提出済み判定するため、未提出は空配列
            submissions: a.submitted ? [{ dateSubmitted: now }] : [],
            allowResubmission: (a.allowResubmitNumber || '0') !== '0'
          };
        });

      // 過去の提出済み・採点済み課題も含める（quiz含む全タイプ）
      var submittedItems = (data.submitted || [])
        .filter(function (s) { return s.courseId === courseIdA; })
        .map(function (s, i) {
          // 締め切りは過去だが closeTime を未来に設定して decode フィルタを通過させる
          var dueMs = now - (i + 1) * 5 * 86400000;     // 5日ずつ過去にずらす
          var openMs = dueMs - 14 * 86400000;            // 締切の2週間前に開始
          var submitMs = dueMs - 2 * 86400000;           // 締切の2日前に提出
          var closeMs = now + 30 * 86400000;             // closeTime は30日後（フィルタ通過用）
          return {
            id: s.id,
            title: s.title,
            dueTime: { epochSecond: Math.floor(dueMs / 1000) },
            dueTimeString: toISO(dueMs),
            closeTime: { epochSecond: Math.floor(closeMs / 1000) },
            closeTimeString: toISO(closeMs),
            openTime: { epochSecond: Math.floor(openMs / 1000) },
            openTimeString: toISO(openMs),
            submissions: [{ dateSubmitted: submitMs }],
            allowResubmission: false
          };
        });

      return { assignment_collection: assignments.concat(submittedItems) };
    }

    // /direct/sam_pub/context/{courseId}.json — コース別小テスト一覧
    m = url.match(/\/direct\/sam_pub\/context\/([^/.]+)\.json/);
    if (m) {
      var courseIdQ = m[1];
      var quizzes = (data.assignments || [])
        .filter(function (a) { return a.courseId === courseIdQ && a.type === 'quiz'; })
        .map(function (q) {
          return {
            publishedAssessmentId: q.id,
            title: q.title,
            dueDate: now + (q.dueOffset ? q.dueOffset.hours * 3600000 : 0),
            startDate: now - 86400000,
            hasSubmission: q.submitted || false,
            submissionSize: q.submitted ? 1 : 0
          };
        });
      // 提出済み小テストも追加
      var submittedQuizzes = (data.submitted || [])
        .filter(function (s) { return s.courseId === courseIdQ && s.type === 'quiz'; })
        .map(function (s) {
          return {
            publishedAssessmentId: s.id,
            title: s.title,
            dueDate: now - 3600000,
            startDate: now - 604800000,
            hasSubmission: true,
            submissionSize: 1
          };
        });
      return { sam_pub_collection: quizzes.concat(submittedQuizzes) };
    }

    // /direct/content/site/{siteId}.json — コース別ファイルツリー
    m = url.match(/\/direct\/content\/site\/([^/.]+)\.json/);
    if (m) {
      var siteIdC = m[1];
      var tree = data.fileTree ? data.fileTree[siteIdC] : null;
      return tree || { content_collection: [] };
    }

    // /direct/announcement/site/{courseId}.json — コース別お知らせ
    m = url.match(/\/direct\/announcement\/site\/([^/.]+)\.json/);
    if (m) {
      var courseIdAnn = m[1];
      var announcements = data.announcements ? data.announcements[courseIdAnn] : [];
      return { announcement_collection: announcements || [] };
    }

    // /direct/site/{siteId}.json — 単一サイト情報
    // NOTE: この判定は /direct/site.json より後に置くこと
    m = url.match(/\/direct\/site\/([^/.]+)\.json/);
    if (m) {
      var siteIdS = m[1];
      var course = data.courses.find(function (c) { return c.id === siteIdS; });
      if (course) {
        return {
          id: course.id,
          title: course.name,
          description: course.description || '',
          shortDescription: '',
          contactName: course.instructor,
          type: 'course'
        };
      }
      return null;
    }

    // /direct/calendar/site/{siteId}.json — カレンダーイベント
    m = url.match(/\/direct\/calendar\/site\/([^/.]+)\.json/);
    if (m) {
      return { calendar_collection: [] };
    }

    // /direct/assignment/{assignmentId}.json — 課題詳細
    m = url.match(/\/direct\/assignment\/([^/.]+)\.json/);
    if (m && !url.includes('/site/')) {
      var aId = m[1];
      var allAssignments = data.assignments || [];
      var found = allAssignments.find(function (a) { return a.id === aId; });
      if (found) {
        var nowMs = Date.now();
        return {
          id: found.id,
          title: found.title,
          dueTime: { epochSecond: Math.floor((nowMs + (found.dueOffset ? found.dueOffset.hours * 3600000 : 0)) / 1000) },
          closeTime: { epochSecond: Math.floor((nowMs + (found.closeOffset ? found.closeOffset.hours * 3600000 : 0)) / 1000) },
          openTime: { epochSecond: Math.floor(nowMs / 1000) - 86400 },
          submissions: found.submitted ? [{ dateSubmitted: nowMs }] : [{ dateSubmitted: null }],
          allowResubmission: false
        };
      }
    }

    // /portal/favorites/list — お気に入りサイト一覧
    if (url.match(/\/portal\/favorites\/list/)) {
      return { favoriteSiteIds: data.courses.map(function (c) { return c.id; }) };
    }

    // /sakai-ws/rest/ — i18n等のSakai内部API
    if (url.match(/\/sakai-ws\/rest\//)) {
      return {};
    }

    return null;
  }

  window.fetch = function (url, options) {
    if (typeof url !== 'string') return _originalFetch(url, options);

    var mockResp = matchMockAPI(url);
    if (mockResp !== null) {
      console.log('[Demo Shim] Intercepted fetch:', url);
      return Promise.resolve(new Response(JSON.stringify(mockResp), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }));
    }

    return _originalFetch(url, options);
  };

  // ----------------------------------------------------------------
  // 7. デモ状態の初期化
  // ----------------------------------------------------------------

  window.DEMO_STATE = window.DEMO_STATE || {
    year: '2025',
    term: '春',
    extensionEnabled: false
  };

  // ----------------------------------------------------------------
  // 8. XMLHttpRequest インターセプト（/portal/favorites/list 等）
  // ----------------------------------------------------------------

  var _OrigXHR = window.XMLHttpRequest;
  window.XMLHttpRequest = function () {
    var xhr = new _OrigXHR();
    var _open = xhr.open.bind(xhr);
    xhr.open = function (method, url) {
      xhr._demoUrl = url;
      return _open.apply(this, arguments);
    };
    var _send = xhr.send.bind(xhr);
    xhr.send = function () {
      if (typeof xhr._demoUrl === 'string') {
        var mockResp = matchMockAPI(xhr._demoUrl);
        if (mockResp !== null) {
          console.log('[Demo Shim] Intercepted XHR:', xhr._demoUrl);
          // Simulate async response
          setTimeout(function () {
            try {
              Object.defineProperty(xhr, 'readyState', { get: function () { return 4; }, configurable: true });
              Object.defineProperty(xhr, 'status', { get: function () { return 200; }, configurable: true });
              Object.defineProperty(xhr, 'response', { get: function () { return mockResp; }, configurable: true });
              Object.defineProperty(xhr, 'responseText', { get: function () { return JSON.stringify(mockResp); }, configurable: true });
            } catch (e) {
              // Some properties may not be configurable; attach directly
              xhr._mockResponse = mockResp;
              xhr._mockResponseText = JSON.stringify(mockResp);
            }
            try {
              if (typeof xhr.onload === 'function') xhr.onload();
              xhr.dispatchEvent(new Event('load'));
            } catch (e) {
              console.warn('[Demo Shim] XHR event dispatch error:', e.message);
            }
          }, 10);
          return;
        }
      }
      return _send.apply(this, arguments);
    };
    return xhr;
  };
  // Preserve prototype chain
  window.XMLHttpRequest.prototype = _OrigXHR.prototype;
  window.XMLHttpRequest.DONE = 4;
  window.XMLHttpRequest.HEADERS_RECEIVED = 2;
  window.XMLHttpRequest.LOADING = 3;
  window.XMLHttpRequest.OPENED = 1;
  window.XMLHttpRequest.UNSENT = 0;

  // ----------------------------------------------------------------
  // 9. URL を /portal パスに書き換え（getBaseURL() 互換）
  // ----------------------------------------------------------------
  // 拡張機能の getBaseURL() は location.href に "/portal" が含まれることを前提とする。
  // demo-controls.js の turnOn() から呼び出す（リロード時に404にならないよう遅延実行）
  window._demoRewriteURL = function () {
    if (!window.location.pathname.includes('/portal')) {
      try {
        // 現在年度の最初のコースIDを使用（フォルダ・メモ・課題のAPIルックアップと一致させる）
        var state = window.DEMO_STATE || { year: '2025' };
        var data = window.DEMO_DATA ? window.DEMO_DATA[state.year] : null;
        var siteId = (data && data.courses && data.courses.length > 0)
          ? data.courses[Math.floor(Math.random() * data.courses.length)].id
          : '~demo';
        history.replaceState(null, '', '/portal/site/' + siteId);
        console.log('[Demo Shim] URL rewritten to', window.location.href);
      } catch (e) {
        console.warn('[Demo Shim] Failed to rewrite URL:', e);
      }
    }
  };
  window._demoRestoreURL = function () {
    if (window.location.pathname.includes('/portal')) {
      try {
        history.replaceState(null, '', '/tact-mock/index.html');
        console.log('[Demo Shim] URL restored to', window.location.href);
      } catch (e) {
        console.warn('[Demo Shim] Failed to restore URL:', e);
      }
    }
  };

  // ----------------------------------------------------------------
  // 10. fileTree の url: "#" をダミー Blob URL に置換
  // ----------------------------------------------------------------

  /**
   * ダミーPDF (1ページ、ASCIIタイトル入り) の Blob URL を生成する。
   * バイトオフセットを正確に計算するため Uint8Array で構築する。
   */
  function makeDummyPdfUrl(title) {
    var enc = new TextEncoder();

    // 日本語タイトルからASCII部分だけ抽出（PDF Type1 フォントは Latin-1 のみ）
    var asciiTitle = title.replace(/[^\x20-\x7E]/g, '') || 'Document';
    var safeTitle = asciiTitle.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
    // タイトル行 + 説明行の2行構成
    var stream = 'BT /F1 20 Tf 56 700 Td (' + safeTitle + ') Tj '
      + '0 -30 Td /F1 12 Tf (This is a demo file for Comfortable NU extension preview.) Tj '
      + '0 -20 Td (Actual content would be provided by the TACT LMS.) Tj ET';
    var streamBytes = enc.encode(stream);

    // 各オブジェクトをバイト配列として構築
    var parts = [];
    var offsets = [];
    var totalLen = 0;

    function addRaw(str) {
      var b = enc.encode(str);
      parts.push(b);
      totalLen += b.length;
    }

    function obj(content) {
      offsets.push(totalLen);
      addRaw((offsets.length) + ' 0 obj\n' + content + '\nendobj\n');
    }

    // ヘッダー
    addRaw('%PDF-1.4\n');

    obj('<< /Type /Catalog /Pages 2 0 R >>');
    obj('<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
    obj('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792]'
      + ' /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>');

    // ストリームオブジェクト — Length はバイト数で指定
    offsets.push(totalLen);
    addRaw('4 0 obj\n<< /Length ' + streamBytes.length + ' >>\nstream\n');
    parts.push(streamBytes);
    totalLen += streamBytes.length;
    addRaw('\nendstream\nendobj\n');

    obj('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');

    // xref
    var xrefStart = totalLen;
    var xrefLines = 'xref\n0 ' + (offsets.length + 1) + '\n';
    xrefLines += '0000000000 65535 f \n';
    for (var i = 0; i < offsets.length; i++) {
      var off = String(offsets[i]);
      while (off.length < 10) off = '0' + off;
      xrefLines += off + ' 00000 n \n';
    }
    xrefLines += 'trailer << /Size ' + (offsets.length + 1) + ' /Root 1 0 R >>\n';
    xrefLines += 'startxref\n' + xrefStart + '\n%%EOF';
    addRaw(xrefLines);

    // Blob は parts 配列をそのまま結合してくれる（ヌルバイト混入を防ぐ）
    var blob = new Blob(parts, { type: 'application/pdf' });
    return URL.createObjectURL(blob);
  }

  /**
   * DEMO_DATA 内の全 fileTree エントリで url: "#" を
   * ダミー PDF Blob URL に置換する。
   */
  function patchFileTreeUrls() {
    if (!window.DEMO_DATA) return;
    var count = 0;
    Object.keys(window.DEMO_DATA).forEach(function (year) {
      var ft = window.DEMO_DATA[year].fileTree;
      if (!ft) return;
      Object.keys(ft).forEach(function (siteId) {
        var items = ft[siteId].content_collection;
        if (!items) return;
        items.forEach(function (item) {
          if (item.url === '#') {
            item.url = makeDummyPdfUrl(item.title || 'Untitled');
            count++;
          }
        });
      });
    });
    if (count > 0) {
      console.log('[Demo Shim] Patched', count, 'fileTree URLs with dummy PDFs');
    }
  }

  patchFileTreeUrls();

  // ----------------------------------------------------------------
  // 初期化完了ログ
  // ----------------------------------------------------------------

  console.log('[Demo Shim] Chrome API mock initialized');
})();
