// スムーズスクロール機能
document.addEventListener('DOMContentLoaded', function() {
    // ナビゲーションメニューのスムーズスクロール
    const navLinks = document.querySelectorAll('.nav-link[href^="#"]');

    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();

            const targetId = this.getAttribute('href');
            const targetSection = document.querySelector(targetId);

            if (targetSection) {
                const headerHeight = document.querySelector('.header').offsetHeight;
                const targetPosition = targetSection.offsetTop - headerHeight - 20;

                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });

    // ハンバーガーメニューの実装
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');

    if (hamburger && navMenu) {
        hamburger.addEventListener('click', function() {
            hamburger.classList.toggle('active');
            navMenu.classList.toggle('active');
        });

        // メニュー項目をクリックしたときにメニューを閉じる
        navLinks.forEach(link => {
            link.addEventListener('click', function() {
                hamburger.classList.remove('active');
                navMenu.classList.remove('active');
            });
        });
    }

    // スクロール時のヘッダースタイル変更
    const header = document.querySelector('.header');

    window.addEventListener('scroll', function() {
        if (window.scrollY > 100) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });

    // アニメーション遅延の実装
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.animationDelay = `${Math.random() * 0.3}s`;
                entry.target.classList.add('animate');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // アニメーション対象要素の監視
    const animateElements = document.querySelectorAll('.feature-card, .download-card, .support-card');
    animateElements.forEach(el => {
        observer.observe(el);
    });

    // ダウンロードボタンのクリック追跡（オプション）
    const downloadButtons = document.querySelectorAll('.btn-download');
    downloadButtons.forEach(button => {
        button.addEventListener('click', function() {
            const browserType = this.closest('.download-card').querySelector('h3').textContent;
            console.log(`Download clicked for: ${browserType}`);
        });
    });

    // パフォーマンス最適化: 画像の遅延読み込み
    const images = document.querySelectorAll('img[data-src]');
    const imageObserver = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.classList.remove('lazy');
                imageObserver.unobserve(img);
            }
        });
    });

    images.forEach(img => {
        imageObserver.observe(img);
    });

    // フォームの簡単なバリデーション
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        form.addEventListener('submit', function(e) {
            const requiredFields = form.querySelectorAll('[required]');
            let isValid = true;

            requiredFields.forEach(field => {
                if (!field.value.trim()) {
                    isValid = false;
                    field.classList.add('error');
                } else {
                    field.classList.remove('error');
                }
            });

            if (!isValid) {
                e.preventDefault();
                alert('必須項目を入力してください。');
            }
        });
    });

    // FAQ機能の実装
    const faqItems = document.querySelectorAll('.faq-item');
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        question.addEventListener('click', function() {
            const isActive = item.classList.contains('active');

            faqItems.forEach(otherItem => {
                otherItem.classList.remove('active');
            });

            if (!isActive) {
                item.classList.add('active');
            }
        });
    });

    // キーボードナビゲーションのサポート
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            hamburger.classList.remove('active');
            navMenu.classList.remove('active');
        }
    });

    // テーマの切り替え機能（ダークモード対応）
    const themeToggle = document.querySelector('.theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', function() {
            document.body.classList.toggle('dark-theme');
            localStorage.setItem('theme', document.body.classList.contains('dark-theme') ? 'dark' : 'light');
        });

        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            document.body.classList.add('dark-theme');
        }
    }

    // ========================================
    // miniSakai デモ機能
    // ========================================
    initMiniSakaiDemo();
});

// エラーハンドリング
window.addEventListener('error', function(e) {
    console.error('JavaScript Error:', e.error);
});

// リサイズ処理の最適化
let resizeTimeout;
window.addEventListener('resize', function() {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(function() {
        const hero = document.querySelector('.hero');
        if (hero && window.innerWidth < 768) {
            hero.classList.add('mobile');
        } else if (hero) {
            hero.classList.remove('mobile');
        }
    }, 250);
});

// ページ読み込み完了
window.addEventListener('load', function() {
    const preloader = document.querySelector('.preloader');
    if (preloader) {
        preloader.style.opacity = '0';
        setTimeout(() => {
            preloader.style.display = 'none';
        }, 300);
    }
    document.body.classList.add('loaded');
});

// ========================================
// miniSakai デモ - データ & レンダリング
// ========================================

function initMiniSakaiDemo() {
    var panel = document.getElementById('miniSakai-demo');
    if (!panel) return;

    // 現在時刻をベースにデモデータを動的に生成
    var now = new Date();

    // 取得日時を表示
    var assignTimeEl = document.getElementById('demo-assignment-time');
    var quizTimeEl = document.getElementById('demo-quiz-time');
    if (assignTimeEl) assignTimeEl.textContent = formatDate(now);
    if (quizTimeEl) quizTimeEl.textContent = formatDate(new Date(now.getTime() - 3 * 60 * 1000));

    // デモ用の課題データ
    var courses = {
        algo: { name: 'アルゴリズムとデータ構造(春/金１限)', id: 'algo' },
        vacuum: { name: '真空電子工学(春/月２限)', id: 'vacuum' },
        control: { name: '制御工学(春/金２限)', id: 'control' },
        dsp: { name: 'ディジタル信号処理(春/木２限)', id: 'dsp' },
        lab: { name: '電気電子情報工学実験第１(春/火３-５限)', id: 'lab' },
        linear: { name: '線形代数学(春/水１限)', id: 'linear' }
    };

    // danger: 24時間以内
    var dangerEntries = [
        {
            course: courses.algo,
            dueType: 'danger',
            entries: [
                { type: 'quiz', title: '第12回確認テスト', due: addHours(now, 6), resubmit: null },
                { type: 'assignment', title: '宿題12: 動的計画法の実装', due: addHours(now, 18), resubmit: '0' }
            ]
        }
    ];

    // warning: 5日以内
    var warningEntries = [
        {
            course: courses.vacuum,
            dueType: 'warning',
            entries: [
                { type: 'assignment', title: '講義レポート（第11回）', due: addDays(now, 2), resubmit: '0' }
            ]
        },
        {
            course: courses.control,
            dueType: 'warning',
            entries: [
                { type: 'assignment', title: '「第十章」の講義予習動画を見たら行う課題', due: addDays(now, 4), resubmit: '0' }
            ]
        }
    ];

    // success: 14日以内
    var successEntries = [
        {
            course: courses.algo,
            dueType: 'success',
            entries: [
                { type: 'quiz', title: '第13回確認テスト', due: addDays(now, 7), resubmit: null }
            ]
        },
        {
            course: courses.dsp,
            dueType: 'success',
            entries: [
                { type: 'assignment', title: 'レポート6', due: addDays(now, 10), resubmit: '-1' }
            ]
        },
        {
            course: courses.linear,
            dueType: 'success',
            entries: [
                { type: 'memo', title: '教科書 5.3節を復習する', due: addDays(now, 8), resubmit: null }
            ]
        }
    ];

    // other: 14日超
    var otherEntries = [
        {
            course: courses.dsp,
            dueType: 'other',
            entries: [
                { type: 'assignment', title: 'レポート7', due: addDays(now, 21), resubmit: '-1' },
                { type: 'assignment', title: 'レポート8（最終）', due: addDays(now, 35), resubmit: '-1' }
            ]
        },
        {
            course: courses.lab,
            dueType: 'other',
            entries: [
                { type: 'assignment', title: 'A2B7 「磁気測定」レポート', due: addDays(now, 28), resubmit: '-1' },
                { type: 'assignment', title: 'C1A7「演算増幅器」レポート', due: addDays(now, 30), resubmit: '0' },
                { type: 'assignment', title: 'B2C8 「パルス伝送」レポート', due: addDays(now, 42), resubmit: '5' }
            ]
        }
    ];

    // 提出済みエントリ
    var submittedEntries = [
        {
            course: courses.algo,
            entries: [
                { type: 'assignment', title: '宿題11: グラフアルゴリズム', due: addDays(now, -2), resubmit: '0' }
            ]
        },
        {
            course: courses.vacuum,
            entries: [
                { type: 'assignment', title: '講義レポート（第10回）', due: addDays(now, -1), resubmit: '-1' }
            ]
        },
        {
            course: courses.control,
            entries: [
                { type: 'quiz', title: '中間テスト復習クイズ', due: addDays(now, -5), resubmit: null }
            ]
        }
    ];

    // 非表示エントリ
    var dismissedEntries = [
        {
            course: courses.linear,
            entries: [
                { type: 'assignment', title: '演習問題セット（任意提出）', due: addDays(now, 14), resubmit: '-1', timestamp: '2025/12/31/23' }
            ]
        }
    ];

    // 各リストをレンダリング
    renderEntryList('demo-list-danger', dangerEntries);
    renderEntryList('demo-list-warning', warningEntries);
    renderEntryList('demo-list-success', successEntries);
    renderEntryList('demo-list-other', otherEntries);
    renderSubmittedList('demo-list-submitted', submittedEntries);
    renderDismissedList('demo-list-dismissed', dismissedEntries);

    // 空リストを非表示
    ['demo-list-danger', 'demo-list-warning', 'demo-list-success', 'demo-list-other'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el && el.children.length === 0) {
            el.style.display = 'none';
        }
    });

    // ダークテーマトグル
    var darkToggle = document.getElementById('demo-dark-theme');
    if (darkToggle) {
        darkToggle.addEventListener('change', function() {
            panel.classList.toggle('dark-theme', this.checked);
        });
    }

    // カラーリセットボタン
    var resetBtn = document.getElementById('demo-reset-colors');
    if (resetBtn) {
        resetBtn.addEventListener('click', function() {
            var defaults = {
                topDanger: '#f78989', topWarning: '#fdd783', topSuccess: '#8bd48d', topOther: '#adadad',
                miniDanger: '#e85555', miniWarning: '#d7aa57', miniSuccess: '#62b665', miniOther: '#777777'
            };
            var colorInputs = panel.querySelectorAll('input[type="color"][data-var]');
            colorInputs.forEach(function(input) {
                var varName = input.getAttribute('data-var');
                if (defaults[varName]) {
                    input.value = defaults[varName];
                    panel.style.setProperty('--' + varName, defaults[varName]);
                }
            });
        });
    }

    // カラーピッカーのリアルタイム反映
    var colorInputs = panel.querySelectorAll('input[type="color"][data-var]');
    colorInputs.forEach(function(input) {
        input.addEventListener('input', function() {
            var varName = this.getAttribute('data-var');
            panel.style.setProperty('--' + varName, this.value);
        });
    });

    // マイナスボタンのデモ動作
    panel.addEventListener('click', function(e) {
        var btn = e.target.closest('.cs-minus-button');
        if (btn) {
            var courseBlock = btn.closest('.cs-assignment-danger, .cs-assignment-warning, .cs-assignment-success, .cs-assignment-other');
            if (courseBlock) {
                courseBlock.style.transition = 'opacity 0.3s, transform 0.3s';
                courseBlock.style.opacity = '0';
                courseBlock.style.transform = 'translateX(20px)';
                setTimeout(function() {
                    courseBlock.style.display = 'none';
                }, 300);
            }
        }
    });
}

// ========================================
// レンダリングヘルパー
// ========================================

function renderEntryList(containerId, courseEntries) {
    var container = document.getElementById(containerId);
    if (!container) return;

    courseEntries.forEach(function(courseData) {
        var dueType = courseData.dueType;
        var block = document.createElement('div');
        block.className = 'cs-assignment-' + dueType;

        // コース名
        var courseLabel = document.createElement('a');
        courseLabel.className = 'cs-course-' + dueType + ' cs-course-name';
        courseLabel.href = '#';
        courseLabel.onclick = function(e) { e.preventDefault(); };
        courseLabel.textContent = courseData.course.name;
        block.appendChild(courseLabel);

        // エントリ
        courseData.entries.forEach(function(entry) {
            renderEntry(block, entry, dueType);
        });

        container.appendChild(block);
    });
}

function renderSubmittedList(containerId, courseEntries) {
    var container = document.getElementById(containerId);
    if (!container) return;

    if (courseEntries.length === 0) {
        var empty = document.createElement('div');
        empty.className = 'cs-empty-message';
        empty.textContent = '提出済みの課題はありません';
        container.appendChild(empty);
        return;
    }

    courseEntries.forEach(function(courseData) {
        var block = document.createElement('div');
        block.className = 'cs-assignment-submitted';

        var courseLabel = document.createElement('a');
        courseLabel.className = 'cs-course-submitted cs-course-name';
        courseLabel.href = '#';
        courseLabel.onclick = function(e) { e.preventDefault(); };
        courseLabel.textContent = courseData.course.name;
        block.appendChild(courseLabel);

        courseData.entries.forEach(function(entry) {
            renderSubmittedEntry(block, entry);
        });

        container.appendChild(block);
    });
}

function renderDismissedList(containerId, courseEntries) {
    var container = document.getElementById(containerId);
    if (!container) return;

    if (courseEntries.length === 0) {
        var empty = document.createElement('div');
        empty.className = 'cs-empty-message';
        empty.textContent = '非表示に設定した課題はありません';
        container.appendChild(empty);
        return;
    }

    courseEntries.forEach(function(courseData) {
        var block = document.createElement('div');
        block.className = 'cs-assignment-other';
        block.style.opacity = '0.7';

        var courseLabel = document.createElement('a');
        courseLabel.className = 'cs-course-other cs-course-name';
        courseLabel.href = '#';
        courseLabel.onclick = function(e) { e.preventDefault(); };
        courseLabel.textContent = courseData.course.name;
        block.appendChild(courseLabel);

        courseData.entries.forEach(function(entry) {
            renderDismissedEntry(block, entry);
        });

        container.appendChild(block);
    });
}

function renderEntry(parent, entry, dueType) {
    var now = new Date();

    // マイナスボタン
    var minusBtn = document.createElement('div');
    minusBtn.className = 'cs-minus-button';
    minusBtn.title = '非表示にする';
    parent.appendChild(minusBtn);

    // 日付
    var dateP = document.createElement('p');
    dateP.className = 'cs-assignment-date';
    dateP.textContent = formatDueDate(entry.due);
    parent.appendChild(dateP);

    // 残り時間
    var remain = document.createElement('span');
    remain.className = 'cs-assignment-time-remain';
    remain.textContent = getRemainString(entry.due, now);
    parent.appendChild(remain);

    // タイトル行
    var titleP = document.createElement('p');
    titleP.className = 'cs-assignment-title';

    if (entry.type === 'quiz') {
        var quizBadge = document.createElement('span');
        quizBadge.className = 'cs-badge cs-badge-quiz';
        quizBadge.textContent = 'クイズ';
        titleP.appendChild(quizBadge);
    } else if (entry.type === 'memo') {
        var memoBadge = document.createElement('span');
        memoBadge.className = 'cs-badge cs-badge-memo';
        memoBadge.textContent = 'メモ';
        titleP.appendChild(memoBadge);
    }

    titleP.appendChild(document.createTextNode(entry.title));
    parent.appendChild(titleP);

    // バッジ（再提出情報）
    if (entry.resubmit !== null && entry.resubmit !== undefined) {
        var badgesDiv = document.createElement('div');
        badgesDiv.className = 'cs-assignment-badges';

        if (entry.resubmit === '-1') {
            var badge = document.createElement('span');
            badge.className = 'cs-badge cs-badge-resubmit';
            badge.textContent = '再提出可能: 無制限';
            badgesDiv.appendChild(badge);
        } else if (entry.resubmit === '0') {
            var badge = document.createElement('span');
            badge.className = 'cs-badge cs-badge-resubmit-disabled';
            badge.textContent = '再提出不可';
            badgesDiv.appendChild(badge);
        } else {
            var num = parseInt(entry.resubmit);
            if (!isNaN(num) && num > 0) {
                var badge = document.createElement('span');
                badge.className = 'cs-badge cs-badge-resubmit';
                badge.textContent = '再提出可能: ' + num + '回';
                badgesDiv.appendChild(badge);
            }
        }

        parent.appendChild(badgesDiv);
    }
}

function renderSubmittedEntry(parent, entry) {
    // ダミーボタン
    var dummyBtn = document.createElement('span');
    dummyBtn.className = 'cs-dummy-btn';
    dummyBtn.textContent = '+';
    parent.appendChild(dummyBtn);

    // 日付
    var dateP = document.createElement('p');
    dateP.className = 'cs-assignment-date';
    dateP.textContent = formatDueDate(entry.due);
    parent.appendChild(dateP);

    // タイトル
    var titleP = document.createElement('p');
    titleP.className = 'cs-assignment-title';

    if (entry.type === 'quiz') {
        var quizBadge = document.createElement('span');
        quizBadge.className = 'cs-badge cs-badge-quiz';
        quizBadge.textContent = 'クイズ';
        titleP.appendChild(quizBadge);
    }

    titleP.appendChild(document.createTextNode(entry.title));
    parent.appendChild(titleP);

    // 再提出バッジ
    if (entry.resubmit === '-1') {
        var badgesDiv = document.createElement('div');
        badgesDiv.className = 'cs-assignment-badges';
        var badge = document.createElement('span');
        badge.className = 'cs-badge cs-badge-resubmit';
        badge.textContent = '再提出可能: 無制限';
        badgesDiv.appendChild(badge);
        parent.appendChild(badgesDiv);
    }
}

function renderDismissedEntry(parent, entry) {
    // 日付
    var dateP = document.createElement('p');
    dateP.className = 'cs-assignment-date';
    dateP.textContent = formatDueDate(entry.due);
    parent.appendChild(dateP);

    // タイトル
    var titleP = document.createElement('p');
    titleP.className = 'cs-assignment-title';

    var dismissedBadge = document.createElement('span');
    dismissedBadge.className = 'cs-badge cs-badge-dismissed';
    dismissedBadge.textContent = '非表示';
    titleP.appendChild(dismissedBadge);

    titleP.appendChild(document.createTextNode(entry.title));
    parent.appendChild(titleP);

    // タイムスタンプバッジ
    if (entry.timestamp) {
        var badgesDiv = document.createElement('div');
        badgesDiv.className = 'cs-assignment-badges';
        var tsBadge = document.createElement('span');
        tsBadge.className = 'cs-badge cs-badge-timestamp';
        tsBadge.textContent = '非表示期限: ' + entry.timestamp;
        badgesDiv.appendChild(tsBadge);
        parent.appendChild(badgesDiv);
    }
}

// ========================================
// ユーティリティ関数
// ========================================

function formatDate(d) {
    return d.getFullYear() + '/' +
        (d.getMonth() + 1) + '/' +
        d.getDate() + ' ' +
        padZero(d.getHours()) + ':' +
        padZero(d.getMinutes()) + ':' +
        padZero(d.getSeconds());
}

function formatDueDate(d) {
    return d.getFullYear() + '/' +
        (d.getMonth() + 1) + '/' +
        d.getDate() + ' ' +
        padZero(d.getHours()) + ':' +
        padZero(d.getMinutes());
}

function padZero(n) {
    return n < 10 ? '0' + n : '' + n;
}

function getRemainString(due, now) {
    var diff = due.getTime() - now.getTime();
    if (diff <= 0) return '期限切れ';

    var days = Math.floor(diff / (1000 * 60 * 60 * 24));
    var hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    var minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) {
        return 'あと' + days + '日' + hours + '時間' + minutes + '分';
    } else {
        return 'あと' + hours + '時間' + minutes + '分';
    }
}

function addHours(date, h) {
    return new Date(date.getTime() + h * 60 * 60 * 1000);
}

function addDays(date, d) {
    return new Date(date.getTime() + d * 24 * 60 * 60 * 1000);
}
