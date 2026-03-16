/**
 * demo-data.js
 * 名古屋大学 TACT (Sakai LMS) デモ用モックデータ
 * 3学年分（2023・2024・2025年度）の講義・課題・ファイルツリー・お知らせを定義する。
 *
 * dueOffset: 現在時刻からの相対時間（時間単位）で締め切りを表す。
 * 実際のタイムスタンプは window.DEMO_HELPERS.resolveDueTime() で解決される。
 *
 * 曜日番号: 1=月, 2=火, 3=水, 4=木, 5=金
 */

window.DEMO_DATA = {

  /* =========================================================
   * 2025年度（3年生・専門科目）
   * ========================================================= */
  "2025": {
    term: "春",

    courses: [
      {
        id: "n_2025_0846280",
        name: "アルゴリズムとデータ構造(2025年度春/金1限)",
        shortName: "アルゴリズムとデータ構造",
        period: { day: 5, period: 1 },
        instructor: "山田 太郎",
        description: "アルゴリズムとデータ構造の基礎を学ぶ"
      },
      {
        id: "n_2025_0846270",
        name: "真空電子工学(2025年度春/月2限)",
        shortName: "真空電子工学",
        period: { day: 1, period: 2 },
        instructor: "佐藤 次郎",
        description: "真空中の電子の挙動を学ぶ"
      },
      {
        id: "n_2025_0846230",
        name: "制御工学(2025年度春/金2限)",
        shortName: "制御工学",
        period: { day: 5, period: 2 },
        instructor: "鈴木 三郎",
        description: "フィードバック制御の基礎"
      },
      {
        id: "n_2025_0846240",
        name: "ディジタル信号処理(2025年度春/木2限)",
        shortName: "ディジタル信号処理",
        period: { day: 4, period: 2 },
        instructor: "高橋 四郎",
        description: "ディジタル信号処理の基礎理論"
      },
      {
        id: "n_2025_0846130",
        name: "[遠隔]電気電子情報工学実験第1(2025年度春/火3限,火4限,火5限)",
        shortName: "電気電子情報工学実験第1",
        period: { day: 2, period: 3 },
        instructor: "田中 五郎",
        description: "電気電子情報工学の基礎実験"
      },
      {
        id: "n_2025_0846300",
        name: "線形代数学II(2025年度春/水1限)",
        shortName: "線形代数学II",
        period: { day: 3, period: 1 },
        instructor: "伊藤 六郎",
        description: "線形代数学の応用"
      },
      {
        id: "n_2025_0846310",
        name: "英語(コミュニケーション)(2025年度春/月1限)",
        shortName: "英語(コミュニケーション)",
        period: { day: 1, period: 1 },
        instructor: "Brown, James",
        description: "英語コミュニケーション能力の向上"
      },
      {
        id: "n_2025_0846320",
        name: "電磁気学II(2025年度春/水2限)",
        shortName: "電磁気学II",
        period: { day: 3, period: 2 },
        instructor: "渡辺 七郎",
        description: "マクスウェル方程式と電磁波"
      }
    ],

    assignments: [
      // danger: 24時間以内
      {
        id: "2025_a1",
        title: "第9回確認テスト(6/13)",
        type: "quiz",
        dueOffset: { hours: 18 },
        closeOffset: { hours: 18 },
        courseId: "n_2025_0846280",
        submitted: false
      },
      {
        id: "2025_a2",
        title: "レポート課題#8",
        type: "assignment",
        dueOffset: { hours: 6 },
        closeOffset: { hours: 6 },
        courseId: "n_2025_0846270",
        submitted: false
      },
      // warning: 1〜3日
      {
        id: "2025_a3",
        title: "制御工学 中間レポート",
        type: "assignment",
        dueOffset: { hours: 48 },
        closeOffset: { hours: 48 },
        courseId: "n_2025_0846230",
        submitted: false
      },
      {
        id: "2025_a4",
        title: "信号処理 演習問題6",
        type: "assignment",
        dueOffset: { hours: 60 },
        closeOffset: { hours: 60 },
        courseId: "n_2025_0846240",
        submitted: false
      },
      // success: 3〜7日
      {
        id: "2025_a5",
        title: "実験レポート#4",
        type: "assignment",
        dueOffset: { hours: 120 },
        closeOffset: { hours: 120 },
        courseId: "n_2025_0846130",
        submitted: false
      },
      {
        id: "2025_a6",
        title: "線形代数II 演習8",
        type: "assignment",
        dueOffset: { hours: 168 },
        closeOffset: { hours: 168 },
        courseId: "n_2025_0846300",
        submitted: false
      },
      // other: 7日超
      {
        id: "2025_a7",
        title: "英語プレゼンテーション",
        type: "assignment",
        dueOffset: { hours: 336 },
        closeOffset: { hours: 336 },
        courseId: "n_2025_0846310",
        submitted: false
      },
      {
        id: "2025_a8",
        title: "電磁気学II 期末レポート",
        type: "assignment",
        dueOffset: { hours: 504 },
        closeOffset: { hours: 504 },
        courseId: "n_2025_0846320",
        submitted: false
      }
    ],

    submitted: [
      {
        id: "2025_s1",
        title: "第8回確認テスト(6/6)",
        type: "quiz",
        courseId: "n_2025_0846280",
        submitted: true
      },
      {
        id: "2025_s2",
        title: "レポート課題#7",
        type: "assignment",
        courseId: "n_2025_0846270",
        submitted: true
      },
      {
        id: "2025_s3",
        title: "第7回確認テスト(5/30)",
        type: "quiz",
        courseId: "n_2025_0846280",
        submitted: true
      },
      {
        id: "2025_s10",
        title: "アルゴリズム レポート#1",
        type: "assignment",
        courseId: "n_2025_0846280",
        submitted: true
      },
      {
        id: "2025_s11",
        title: "アルゴリズム レポート#2",
        type: "assignment",
        courseId: "n_2025_0846280",
        submitted: true
      },
      {
        id: "2025_s12",
        title: "第6回確認テスト(5/23)",
        type: "quiz",
        courseId: "n_2025_0846280",
        submitted: true
      },
      {
        id: "2025_s4",
        title: "制御工学 演習レポート#3",
        type: "assignment",
        courseId: "n_2025_0846230",
        submitted: true
      },
      {
        id: "2025_s5",
        title: "信号処理 演習問題5",
        type: "assignment",
        courseId: "n_2025_0846240",
        submitted: true
      },
      {
        id: "2025_s6",
        title: "実験レポート#3",
        type: "assignment",
        courseId: "n_2025_0846130",
        submitted: true
      },
      {
        id: "2025_s7",
        title: "線形代数II 演習7",
        type: "assignment",
        courseId: "n_2025_0846300",
        submitted: true
      },
      {
        id: "2025_s8",
        title: "英語 エッセイ課題#2",
        type: "assignment",
        courseId: "n_2025_0846310",
        submitted: true
      }
    ],

    fileTree: {
      "n_2025_0846280": {
        content_collection: [
          {
            id: "/group/n_2025_0846280/",
            title: "アルゴリズムとデータ構造",
            type: "collection",
            container: "/",
            numChildren: 3,
            resourceChildren: [
              "/group/n_2025_0846280/lecture/",
              "/group/n_2025_0846280/exercise/",
              "/group/n_2025_0846280/reference/"
            ]
          },
          {
            id: "/group/n_2025_0846280/lecture/",
            title: "講義スライド",
            type: "collection",
            container: "/group/n_2025_0846280/",
            numChildren: 3,
            resourceChildren: [
              "/group/n_2025_0846280/lecture/01_intro.pdf",
              "/group/n_2025_0846280/lecture/02_sorting.pdf",
              "/group/n_2025_0846280/lecture/03_graph.pdf"
            ]
          },
          {
            id: "/group/n_2025_0846280/lecture/01_intro.pdf",
            title: "01_アルゴリズム入門.pdf",
            type: "application/pdf",
            container: "/group/n_2025_0846280/lecture/",
            url: "#",
            size: 1843200,
            modifiedDate: "2025-04-07T09:00:00Z",
            numChildren: 0
          },
          {
            id: "/group/n_2025_0846280/lecture/02_sorting.pdf",
            title: "02_整列アルゴリズム.pdf",
            type: "application/pdf",
            container: "/group/n_2025_0846280/lecture/",
            url: "#",
            size: 2097152,
            modifiedDate: "2025-04-14T09:00:00Z",
            numChildren: 0
          },
          {
            id: "/group/n_2025_0846280/lecture/03_graph.pdf",
            title: "03_グラフアルゴリズム.pdf",
            type: "application/pdf",
            container: "/group/n_2025_0846280/lecture/",
            url: "#",
            size: 2621440,
            modifiedDate: "2025-04-21T09:00:00Z",
            numChildren: 0
          },
          {
            id: "/group/n_2025_0846280/exercise/",
            title: "演習問題",
            type: "collection",
            container: "/group/n_2025_0846280/",
            numChildren: 2,
            resourceChildren: [
              "/group/n_2025_0846280/exercise/ex01.pdf",
              "/group/n_2025_0846280/exercise/ex02.pdf"
            ]
          },
          {
            id: "/group/n_2025_0846280/exercise/ex01.pdf",
            title: "演習問題1.pdf",
            type: "application/pdf",
            container: "/group/n_2025_0846280/exercise/",
            url: "#",
            size: 512000,
            modifiedDate: "2025-04-10T10:00:00Z",
            numChildren: 0
          },
          {
            id: "/group/n_2025_0846280/exercise/ex02.pdf",
            title: "演習問題2.pdf",
            type: "application/pdf",
            container: "/group/n_2025_0846280/exercise/",
            url: "#",
            size: 524288,
            modifiedDate: "2025-04-17T10:00:00Z",
            numChildren: 0
          },
          {
            id: "/group/n_2025_0846280/reference/",
            title: "参考資料",
            type: "collection",
            container: "/group/n_2025_0846280/",
            numChildren: 1,
            resourceChildren: [
              "/group/n_2025_0846280/reference/textbook_toc.pdf"
            ]
          },
          {
            id: "/group/n_2025_0846280/reference/textbook_toc.pdf",
            title: "教科書目次.pdf",
            type: "application/pdf",
            container: "/group/n_2025_0846280/reference/",
            url: "#",
            size: 307200,
            modifiedDate: "2025-04-04T08:00:00Z",
            numChildren: 0
          }
        ]
      },

      "n_2025_0846270": {
        content_collection: [
          {
            id: "/group/n_2025_0846270/",
            title: "真空電子工学",
            type: "collection",
            container: "/",
            numChildren: 2,
            resourceChildren: [
              "/group/n_2025_0846270/slides/",
              "/group/n_2025_0846270/reports/"
            ]
          },
          {
            id: "/group/n_2025_0846270/slides/",
            title: "講義スライド",
            type: "collection",
            container: "/group/n_2025_0846270/",
            numChildren: 3,
            resourceChildren: [
              "/group/n_2025_0846270/slides/01_vacuum.pdf",
              "/group/n_2025_0846270/slides/02_electron_emission.pdf",
              "/group/n_2025_0846270/slides/03_electron_optics.pdf"
            ]
          },
          {
            id: "/group/n_2025_0846270/slides/01_vacuum.pdf",
            title: "01_真空の基礎.pdf",
            type: "application/pdf",
            container: "/group/n_2025_0846270/slides/",
            url: "#",
            size: 1572864,
            modifiedDate: "2025-04-07T10:00:00Z",
            numChildren: 0
          },
          {
            id: "/group/n_2025_0846270/slides/02_electron_emission.pdf",
            title: "02_電子放出.pdf",
            type: "application/pdf",
            container: "/group/n_2025_0846270/slides/",
            url: "#",
            size: 1835008,
            modifiedDate: "2025-04-14T10:00:00Z",
            numChildren: 0
          },
          {
            id: "/group/n_2025_0846270/slides/03_electron_optics.pdf",
            title: "03_電子光学.pdf",
            type: "application/pdf",
            container: "/group/n_2025_0846270/slides/",
            url: "#",
            size: 2097152,
            modifiedDate: "2025-04-21T10:00:00Z",
            numChildren: 0
          },
          {
            id: "/group/n_2025_0846270/reports/",
            title: "レポート課題",
            type: "collection",
            container: "/group/n_2025_0846270/",
            numChildren: 2,
            resourceChildren: [
              "/group/n_2025_0846270/reports/report_guideline.pdf",
              "/group/n_2025_0846270/reports/report_template.docx"
            ]
          },
          {
            id: "/group/n_2025_0846270/reports/report_guideline.pdf",
            title: "レポート作成指針.pdf",
            type: "application/pdf",
            container: "/group/n_2025_0846270/reports/",
            url: "#",
            size: 409600,
            modifiedDate: "2025-04-05T09:00:00Z",
            numChildren: 0
          },
          {
            id: "/group/n_2025_0846270/reports/report_template.docx",
            title: "レポートテンプレート.docx",
            type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            container: "/group/n_2025_0846270/reports/",
            url: "#",
            size: 204800,
            modifiedDate: "2025-04-05T09:00:00Z",
            numChildren: 0
          }
        ]
      },

      "n_2025_0846230": {
        content_collection: [
          {
            id: "/group/n_2025_0846230/",
            title: "制御工学",
            type: "collection",
            container: "/",
            numChildren: 2,
            resourceChildren: [
              "/group/n_2025_0846230/lecture/",
              "/group/n_2025_0846230/matlab/"
            ]
          },
          {
            id: "/group/n_2025_0846230/lecture/",
            title: "講義資料",
            type: "collection",
            container: "/group/n_2025_0846230/",
            numChildren: 3,
            resourceChildren: [
              "/group/n_2025_0846230/lecture/01_intro_control.pdf",
              "/group/n_2025_0846230/lecture/02_laplace.pdf",
              "/group/n_2025_0846230/lecture/03_pid.pdf"
            ]
          },
          {
            id: "/group/n_2025_0846230/lecture/01_intro_control.pdf",
            title: "01_制御系の基礎.pdf",
            type: "application/pdf",
            container: "/group/n_2025_0846230/lecture/",
            url: "#",
            size: 1966080,
            modifiedDate: "2025-04-08T09:00:00Z",
            numChildren: 0
          },
          {
            id: "/group/n_2025_0846230/lecture/02_laplace.pdf",
            title: "02_ラプラス変換.pdf",
            type: "application/pdf",
            container: "/group/n_2025_0846230/lecture/",
            url: "#",
            size: 2228224,
            modifiedDate: "2025-04-15T09:00:00Z",
            numChildren: 0
          },
          {
            id: "/group/n_2025_0846230/lecture/03_pid.pdf",
            title: "03_PID制御.pdf",
            type: "application/pdf",
            container: "/group/n_2025_0846230/lecture/",
            url: "#",
            size: 2359296,
            modifiedDate: "2025-04-22T09:00:00Z",
            numChildren: 0
          },
          {
            id: "/group/n_2025_0846230/matlab/",
            title: "MATLABスクリプト",
            type: "collection",
            container: "/group/n_2025_0846230/",
            numChildren: 2,
            resourceChildren: [
              "/group/n_2025_0846230/matlab/step_response.m",
              "/group/n_2025_0846230/matlab/bode_plot.m"
            ]
          },
          {
            id: "/group/n_2025_0846230/matlab/step_response.m",
            title: "step_response.m",
            type: "text/plain",
            container: "/group/n_2025_0846230/matlab/",
            url: "#",
            size: 4096,
            modifiedDate: "2025-04-20T14:00:00Z",
            numChildren: 0
          },
          {
            id: "/group/n_2025_0846230/matlab/bode_plot.m",
            title: "bode_plot.m",
            type: "text/plain",
            container: "/group/n_2025_0846230/matlab/",
            url: "#",
            size: 3072,
            modifiedDate: "2025-04-20T14:00:00Z",
            numChildren: 0
          }
        ]
      },

      "n_2025_0846240": {
        content_collection: [
          {
            id: "/group/n_2025_0846240/",
            title: "ディジタル信号処理",
            type: "collection",
            container: "/",
            numChildren: 2,
            resourceChildren: [
              "/group/n_2025_0846240/slides/",
              "/group/n_2025_0846240/exercise/"
            ]
          },
          {
            id: "/group/n_2025_0846240/slides/",
            title: "講義スライド",
            type: "collection",
            container: "/group/n_2025_0846240/",
            numChildren: 3,
            resourceChildren: [
              "/group/n_2025_0846240/slides/01_sampling.pdf",
              "/group/n_2025_0846240/slides/02_dft.pdf",
              "/group/n_2025_0846240/slides/03_filter.pdf"
            ]
          },
          {
            id: "/group/n_2025_0846240/slides/01_sampling.pdf",
            title: "01_標本化定理.pdf",
            type: "application/pdf",
            container: "/group/n_2025_0846240/slides/",
            url: "#",
            size: 1703936,
            modifiedDate: "2025-04-10T09:00:00Z",
            numChildren: 0
          },
          {
            id: "/group/n_2025_0846240/slides/02_dft.pdf",
            title: "02_離散フーリエ変換.pdf",
            type: "application/pdf",
            container: "/group/n_2025_0846240/slides/",
            url: "#",
            size: 2097152,
            modifiedDate: "2025-04-17T09:00:00Z",
            numChildren: 0
          },
          {
            id: "/group/n_2025_0846240/slides/03_filter.pdf",
            title: "03_ディジタルフィルタ.pdf",
            type: "application/pdf",
            container: "/group/n_2025_0846240/slides/",
            url: "#",
            size: 2490368,
            modifiedDate: "2025-04-24T09:00:00Z",
            numChildren: 0
          },
          {
            id: "/group/n_2025_0846240/exercise/",
            title: "演習問題",
            type: "collection",
            container: "/group/n_2025_0846240/",
            numChildren: 2,
            resourceChildren: [
              "/group/n_2025_0846240/exercise/ex_dft.pdf",
              "/group/n_2025_0846240/exercise/ex_filter.pdf"
            ]
          },
          {
            id: "/group/n_2025_0846240/exercise/ex_dft.pdf",
            title: "DFT演習問題.pdf",
            type: "application/pdf",
            container: "/group/n_2025_0846240/exercise/",
            url: "#",
            size: 614400,
            modifiedDate: "2025-04-18T10:00:00Z",
            numChildren: 0
          },
          {
            id: "/group/n_2025_0846240/exercise/ex_filter.pdf",
            title: "フィルタ設計演習.pdf",
            type: "application/pdf",
            container: "/group/n_2025_0846240/exercise/",
            url: "#",
            size: 716800,
            modifiedDate: "2025-05-01T10:00:00Z",
            numChildren: 0
          }
        ]
      },

      "n_2025_0846130": {
        content_collection: [
          {
            id: "/group/n_2025_0846130/",
            title: "電気電子情報工学実験第1",
            type: "collection",
            container: "/",
            numChildren: 3,
            resourceChildren: [
              "/group/n_2025_0846130/manual/",
              "/group/n_2025_0846130/report_format/",
              "/group/n_2025_0846130/safety/"
            ]
          },
          {
            id: "/group/n_2025_0846130/manual/",
            title: "実験テキスト",
            type: "collection",
            container: "/group/n_2025_0846130/",
            numChildren: 3,
            resourceChildren: [
              "/group/n_2025_0846130/manual/exp01_ohm.pdf",
              "/group/n_2025_0846130/manual/exp02_rc.pdf",
              "/group/n_2025_0846130/manual/exp03_opamp.pdf"
            ]
          },
          {
            id: "/group/n_2025_0846130/manual/exp01_ohm.pdf",
            title: "実験1_オームの法則.pdf",
            type: "application/pdf",
            container: "/group/n_2025_0846130/manual/",
            url: "#",
            size: 1048576,
            modifiedDate: "2025-04-07T08:00:00Z",
            numChildren: 0
          },
          {
            id: "/group/n_2025_0846130/manual/exp02_rc.pdf",
            title: "実験2_RC回路.pdf",
            type: "application/pdf",
            container: "/group/n_2025_0846130/manual/",
            url: "#",
            size: 1310720,
            modifiedDate: "2025-04-14T08:00:00Z",
            numChildren: 0
          },
          {
            id: "/group/n_2025_0846130/manual/exp03_opamp.pdf",
            title: "実験3_オペアンプ.pdf",
            type: "application/pdf",
            container: "/group/n_2025_0846130/manual/",
            url: "#",
            size: 1572864,
            modifiedDate: "2025-04-21T08:00:00Z",
            numChildren: 0
          },
          {
            id: "/group/n_2025_0846130/report_format/",
            title: "レポート書式",
            type: "collection",
            container: "/group/n_2025_0846130/",
            numChildren: 2,
            resourceChildren: [
              "/group/n_2025_0846130/report_format/template.docx",
              "/group/n_2025_0846130/report_format/guideline.pdf"
            ]
          },
          {
            id: "/group/n_2025_0846130/report_format/template.docx",
            title: "実験レポートテンプレート.docx",
            type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            container: "/group/n_2025_0846130/report_format/",
            url: "#",
            size: 204800,
            modifiedDate: "2025-04-04T09:00:00Z",
            numChildren: 0
          },
          {
            id: "/group/n_2025_0846130/report_format/guideline.pdf",
            title: "レポート作成要領.pdf",
            type: "application/pdf",
            container: "/group/n_2025_0846130/report_format/",
            url: "#",
            size: 358400,
            modifiedDate: "2025-04-04T09:00:00Z",
            numChildren: 0
          },
          {
            id: "/group/n_2025_0846130/safety/",
            title: "安全教育資料",
            type: "collection",
            container: "/group/n_2025_0846130/",
            numChildren: 1,
            resourceChildren: [
              "/group/n_2025_0846130/safety/lab_safety.pdf"
            ]
          },
          {
            id: "/group/n_2025_0846130/safety/lab_safety.pdf",
            title: "実験室安全マニュアル.pdf",
            type: "application/pdf",
            container: "/group/n_2025_0846130/safety/",
            url: "#",
            size: 819200,
            modifiedDate: "2025-04-01T08:00:00Z",
            numChildren: 0
          }
        ]
      },

      "n_2025_0846300": {
        content_collection: [
          {
            id: "/group/n_2025_0846300/",
            title: "線形代数学II",
            type: "collection",
            container: "/",
            numChildren: 2,
            resourceChildren: [
              "/group/n_2025_0846300/lecture/",
              "/group/n_2025_0846300/exercise/"
            ]
          },
          {
            id: "/group/n_2025_0846300/lecture/",
            title: "講義ノート",
            type: "collection",
            container: "/group/n_2025_0846300/",
            numChildren: 3,
            resourceChildren: [
              "/group/n_2025_0846300/lecture/01_eigenvalue.pdf",
              "/group/n_2025_0846300/lecture/02_diagonalization.pdf",
              "/group/n_2025_0846300/lecture/03_inner_product.pdf"
            ]
          },
          {
            id: "/group/n_2025_0846300/lecture/01_eigenvalue.pdf",
            title: "01_固有値と固有ベクトル.pdf",
            type: "application/pdf",
            container: "/group/n_2025_0846300/lecture/",
            url: "#",
            size: 1441792,
            modifiedDate: "2025-04-09T09:00:00Z",
            numChildren: 0
          },
          {
            id: "/group/n_2025_0846300/lecture/02_diagonalization.pdf",
            title: "02_対角化.pdf",
            type: "application/pdf",
            container: "/group/n_2025_0846300/lecture/",
            url: "#",
            size: 1703936,
            modifiedDate: "2025-04-16T09:00:00Z",
            numChildren: 0
          },
          {
            id: "/group/n_2025_0846300/lecture/03_inner_product.pdf",
            title: "03_内積空間.pdf",
            type: "application/pdf",
            container: "/group/n_2025_0846300/lecture/",
            url: "#",
            size: 1966080,
            modifiedDate: "2025-04-23T09:00:00Z",
            numChildren: 0
          },
          {
            id: "/group/n_2025_0846300/exercise/",
            title: "演習問題",
            type: "collection",
            container: "/group/n_2025_0846300/",
            numChildren: 2,
            resourceChildren: [
              "/group/n_2025_0846300/exercise/ex_eigen.pdf",
              "/group/n_2025_0846300/exercise/ex_diag.pdf"
            ]
          },
          {
            id: "/group/n_2025_0846300/exercise/ex_eigen.pdf",
            title: "固有値演習問題.pdf",
            type: "application/pdf",
            container: "/group/n_2025_0846300/exercise/",
            url: "#",
            size: 512000,
            modifiedDate: "2025-04-11T10:00:00Z",
            numChildren: 0
          },
          {
            id: "/group/n_2025_0846300/exercise/ex_diag.pdf",
            title: "対角化演習問題.pdf",
            type: "application/pdf",
            container: "/group/n_2025_0846300/exercise/",
            url: "#",
            size: 573440,
            modifiedDate: "2025-04-18T10:00:00Z",
            numChildren: 0
          }
        ]
      },

      "n_2025_0846310": {
        content_collection: [
          {
            id: "/group/n_2025_0846310/",
            title: "英語(コミュニケーション)",
            type: "collection",
            container: "/",
            numChildren: 2,
            resourceChildren: [
              "/group/n_2025_0846310/materials/",
              "/group/n_2025_0846310/presentation/"
            ]
          },
          {
            id: "/group/n_2025_0846310/materials/",
            title: "授業資料",
            type: "collection",
            container: "/group/n_2025_0846310/",
            numChildren: 2,
            resourceChildren: [
              "/group/n_2025_0846310/materials/syllabus.pdf",
              "/group/n_2025_0846310/materials/vocab_list.pdf"
            ]
          },
          {
            id: "/group/n_2025_0846310/materials/syllabus.pdf",
            title: "シラバス.pdf",
            type: "application/pdf",
            container: "/group/n_2025_0846310/materials/",
            url: "#",
            size: 307200,
            modifiedDate: "2025-04-04T09:00:00Z",
            numChildren: 0
          },
          {
            id: "/group/n_2025_0846310/materials/vocab_list.pdf",
            title: "語彙リスト.pdf",
            type: "application/pdf",
            container: "/group/n_2025_0846310/materials/",
            url: "#",
            size: 409600,
            modifiedDate: "2025-04-07T09:00:00Z",
            numChildren: 0
          },
          {
            id: "/group/n_2025_0846310/presentation/",
            title: "プレゼンテーション資料",
            type: "collection",
            container: "/group/n_2025_0846310/",
            numChildren: 2,
            resourceChildren: [
              "/group/n_2025_0846310/presentation/guideline.pdf",
              "/group/n_2025_0846310/presentation/rubric.pdf"
            ]
          },
          {
            id: "/group/n_2025_0846310/presentation/guideline.pdf",
            title: "プレゼン課題要項.pdf",
            type: "application/pdf",
            container: "/group/n_2025_0846310/presentation/",
            url: "#",
            size: 512000,
            modifiedDate: "2025-05-12T09:00:00Z",
            numChildren: 0
          },
          {
            id: "/group/n_2025_0846310/presentation/rubric.pdf",
            title: "評価ルーブリック.pdf",
            type: "application/pdf",
            container: "/group/n_2025_0846310/presentation/",
            url: "#",
            size: 358400,
            modifiedDate: "2025-05-12T09:00:00Z",
            numChildren: 0
          }
        ]
      },

      "n_2025_0846320": {
        content_collection: [
          {
            id: "/group/n_2025_0846320/",
            title: "電磁気学II",
            type: "collection",
            container: "/",
            numChildren: 2,
            resourceChildren: [
              "/group/n_2025_0846320/lecture/",
              "/group/n_2025_0846320/formula/"
            ]
          },
          {
            id: "/group/n_2025_0846320/lecture/",
            title: "講義資料",
            type: "collection",
            container: "/group/n_2025_0846320/",
            numChildren: 3,
            resourceChildren: [
              "/group/n_2025_0846320/lecture/01_maxwell.pdf",
              "/group/n_2025_0846320/lecture/02_em_wave.pdf",
              "/group/n_2025_0846320/lecture/03_radiation.pdf"
            ]
          },
          {
            id: "/group/n_2025_0846320/lecture/01_maxwell.pdf",
            title: "01_マクスウェル方程式.pdf",
            type: "application/pdf",
            container: "/group/n_2025_0846320/lecture/",
            url: "#",
            size: 2097152,
            modifiedDate: "2025-04-09T09:00:00Z",
            numChildren: 0
          },
          {
            id: "/group/n_2025_0846320/lecture/02_em_wave.pdf",
            title: "02_電磁波.pdf",
            type: "application/pdf",
            container: "/group/n_2025_0846320/lecture/",
            url: "#",
            size: 2359296,
            modifiedDate: "2025-04-16T09:00:00Z",
            numChildren: 0
          },
          {
            id: "/group/n_2025_0846320/lecture/03_radiation.pdf",
            title: "03_放射と散乱.pdf",
            type: "application/pdf",
            container: "/group/n_2025_0846320/lecture/",
            url: "#",
            size: 2621440,
            modifiedDate: "2025-04-23T09:00:00Z",
            numChildren: 0
          },
          {
            id: "/group/n_2025_0846320/formula/",
            title: "公式集",
            type: "collection",
            container: "/group/n_2025_0846320/",
            numChildren: 1,
            resourceChildren: [
              "/group/n_2025_0846320/formula/em_formulas.pdf"
            ]
          },
          {
            id: "/group/n_2025_0846320/formula/em_formulas.pdf",
            title: "電磁気学公式集.pdf",
            type: "application/pdf",
            container: "/group/n_2025_0846320/formula/",
            url: "#",
            size: 614400,
            modifiedDate: "2025-04-04T08:00:00Z",
            numChildren: 0
          }
        ]
      }
    },

    announcements: {
      "n_2025_0846280": [
        {
          id: "ann_2025_algo_1",
          title: "第9回授業の確認テストについて",
          body: "第9回（6/13）の授業開始時に確認テストを実施します。第7・8回の内容（グラフアルゴリズム）から出題します。資料を復習しておいてください。",
          createdOn: Date.now() - 172800000,
          siteId: "n_2025_0846280"
        },
        {
          id: "ann_2025_algo_2",
          title: "演習問題3の解答を公開しました",
          body: "演習問題3の模範解答をファイルコレクションにアップロードしました。確認してください。",
          createdOn: Date.now() - 604800000,
          siteId: "n_2025_0846280"
        }
      ],
      "n_2025_0846130": [
        {
          id: "ann_2025_exp_1",
          title: "第4回実験レポート提出期限について",
          body: "第4回実験（オペアンプ）のレポートは来週金曜日23:59が提出期限です。遅延提出は受け付けませんので注意してください。",
          createdOn: Date.now() - 259200000,
          siteId: "n_2025_0846130"
        }
      ],
      "n_2025_0846320": [
        {
          id: "ann_2025_em_1",
          title: "電磁気学II 期末レポート課題を公開しました",
          body: "期末レポートの課題をTACTの課題機能に掲載しました。テーマは「平面電磁波の偏光特性」です。詳細は課題ページを確認してください。",
          createdOn: Date.now() - 432000000,
          siteId: "n_2025_0846320"
        }
      ]
    }
  },

  /* =========================================================
   * 2024年度（2年生・専門基礎）
   * ========================================================= */
  "2024": {
    term: "春",

    courses: [
      {
        id: "n_2024_cs201",
        name: "プログラミング及び演習(2024年度春/水1限,水2限)",
        shortName: "プログラミング及び演習",
        period: { day: 3, period: 1 },
        instructor: "中村 一郎",
        description: "C/C++プログラミングの実践"
      },
      {
        id: "n_2024_ee201",
        name: "電子回路工学及び演習(2024年度春/月3限,木3限)",
        shortName: "電子回路工学及び演習",
        period: { day: 1, period: 3 },
        instructor: "小林 二郎",
        description: "トランジスタ回路の解析と設計"
      },
      {
        id: "n_2024_ee202",
        name: "電気回路論及び演習(2024年度春/月4限,木4限)",
        shortName: "電気回路論及び演習",
        period: { day: 1, period: 4 },
        instructor: "加藤 三郎",
        description: "RLC回路と過渡応答"
      },
      {
        id: "n_2024_ma201",
        name: "数学2及び演習(2024年度春/火1限,火3限)",
        shortName: "数学2及び演習",
        period: { day: 2, period: 1 },
        instructor: "吉田 四郎",
        description: "微分方程式とベクトル解析"
      },
      {
        id: "n_2024_cs202",
        name: "オートマトンと形式言語(2024年度春/月3限)",
        shortName: "オートマトンと形式言語",
        period: { day: 1, period: 3 },
        instructor: "松本 五郎",
        description: "有限オートマトンと正規言語"
      },
      {
        id: "n_2024_ph201",
        name: "電磁気学基礎演習(2024年度春/水3限)",
        shortName: "電磁気学基礎演習",
        period: { day: 3, period: 3 },
        instructor: "井上 六郎",
        description: "電磁気学の基本法則"
      },
      {
        id: "n_2024_ph202",
        name: "量子力学及び演習(2024年度春/水3限,水4限)",
        shortName: "量子力学及び演習",
        period: { day: 3, period: 3 },
        instructor: "木村 七郎",
        description: "シュレーディンガー方程式と量子系"
      },
      {
        id: "n_2024_ge201",
        name: "文化・芸術学入門(2024年度春/金1限)",
        shortName: "文化・芸術学入門",
        period: { day: 5, period: 1 },
        instructor: "林 花子",
        description: "芸術と文化の多様性を理解する"
      }
    ],

    assignments: [
      {
        id: "2024_a1",
        title: "プログラミング演習#10",
        type: "assignment",
        dueOffset: { hours: 12 },
        closeOffset: { hours: 12 },
        courseId: "n_2024_cs201",
        submitted: false
      },
      {
        id: "2024_a2",
        title: "電子回路 小テスト第6回",
        type: "quiz",
        dueOffset: { hours: 36 },
        closeOffset: { hours: 36 },
        courseId: "n_2024_ee201",
        submitted: false
      },
      {
        id: "2024_a3",
        title: "電気回路 演習問題5",
        type: "assignment",
        dueOffset: { hours: 96 },
        closeOffset: { hours: 96 },
        courseId: "n_2024_ee202",
        submitted: false
      },
      {
        id: "2024_a4",
        title: "数学2 課題#7",
        type: "assignment",
        dueOffset: { hours: 144 },
        closeOffset: { hours: 144 },
        courseId: "n_2024_ma201",
        submitted: false
      },
      {
        id: "2024_a5",
        title: "オートマトン期末レポート",
        type: "assignment",
        dueOffset: { hours: 240 },
        closeOffset: { hours: 240 },
        courseId: "n_2024_cs202",
        submitted: false
      }
    ],

    submitted: [],

    fileTree: {
      "n_2024_cs201": {
        content_collection: [
          {
            id: "/group/n_2024_cs201/",
            title: "プログラミング及び演習",
            type: "collection",
            container: "/",
            numChildren: 2,
            resourceChildren: [
              "/group/n_2024_cs201/lecture/",
              "/group/n_2024_cs201/code/"
            ]
          },
          {
            id: "/group/n_2024_cs201/lecture/",
            title: "講義資料",
            type: "collection",
            container: "/group/n_2024_cs201/",
            numChildren: 2,
            resourceChildren: [
              "/group/n_2024_cs201/lecture/01_c_intro.pdf",
              "/group/n_2024_cs201/lecture/02_pointer.pdf"
            ]
          },
          {
            id: "/group/n_2024_cs201/lecture/01_c_intro.pdf",
            title: "01_C言語入門.pdf",
            type: "application/pdf",
            container: "/group/n_2024_cs201/lecture/",
            url: "#",
            size: 1572864,
            modifiedDate: "2024-04-08T09:00:00Z",
            numChildren: 0
          },
          {
            id: "/group/n_2024_cs201/lecture/02_pointer.pdf",
            title: "02_ポインタと配列.pdf",
            type: "application/pdf",
            container: "/group/n_2024_cs201/lecture/",
            url: "#",
            size: 1835008,
            modifiedDate: "2024-04-15T09:00:00Z",
            numChildren: 0
          },
          {
            id: "/group/n_2024_cs201/code/",
            title: "サンプルコード",
            type: "collection",
            container: "/group/n_2024_cs201/",
            numChildren: 1,
            resourceChildren: [
              "/group/n_2024_cs201/code/sample.zip"
            ]
          },
          {
            id: "/group/n_2024_cs201/code/sample.zip",
            title: "sample_code.zip",
            type: "application/zip",
            container: "/group/n_2024_cs201/code/",
            url: "#",
            size: 102400,
            modifiedDate: "2024-04-10T10:00:00Z",
            numChildren: 0
          }
        ]
      },

      "n_2024_ee201": {
        content_collection: [
          {
            id: "/group/n_2024_ee201/",
            title: "電子回路工学及び演習",
            type: "collection",
            container: "/",
            numChildren: 2,
            resourceChildren: [
              "/group/n_2024_ee201/slides/",
              "/group/n_2024_ee201/exercise/"
            ]
          },
          {
            id: "/group/n_2024_ee201/slides/",
            title: "スライド",
            type: "collection",
            container: "/group/n_2024_ee201/",
            numChildren: 2,
            resourceChildren: [
              "/group/n_2024_ee201/slides/01_diode.pdf",
              "/group/n_2024_ee201/slides/02_transistor.pdf"
            ]
          },
          {
            id: "/group/n_2024_ee201/slides/01_diode.pdf",
            title: "01_ダイオード回路.pdf",
            type: "application/pdf",
            container: "/group/n_2024_ee201/slides/",
            url: "#",
            size: 1703936,
            modifiedDate: "2024-04-09T09:00:00Z",
            numChildren: 0
          },
          {
            id: "/group/n_2024_ee201/slides/02_transistor.pdf",
            title: "02_トランジスタ増幅回路.pdf",
            type: "application/pdf",
            container: "/group/n_2024_ee201/slides/",
            url: "#",
            size: 2097152,
            modifiedDate: "2024-04-16T09:00:00Z",
            numChildren: 0
          },
          {
            id: "/group/n_2024_ee201/exercise/",
            title: "演習問題",
            type: "collection",
            container: "/group/n_2024_ee201/",
            numChildren: 1,
            resourceChildren: [
              "/group/n_2024_ee201/exercise/ex_transistor.pdf"
            ]
          },
          {
            id: "/group/n_2024_ee201/exercise/ex_transistor.pdf",
            title: "トランジスタ回路演習.pdf",
            type: "application/pdf",
            container: "/group/n_2024_ee201/exercise/",
            url: "#",
            size: 614400,
            modifiedDate: "2024-04-18T10:00:00Z",
            numChildren: 0
          }
        ]
      },

      "n_2024_ee202": {
        content_collection: [
          {
            id: "/group/n_2024_ee202/",
            title: "電気回路論及び演習",
            type: "collection",
            container: "/",
            numChildren: 2,
            resourceChildren: [
              "/group/n_2024_ee202/lecture/",
              "/group/n_2024_ee202/exercise/"
            ]
          },
          {
            id: "/group/n_2024_ee202/lecture/",
            title: "講義資料",
            type: "collection",
            container: "/group/n_2024_ee202/",
            numChildren: 2,
            resourceChildren: [
              "/group/n_2024_ee202/lecture/01_rlc.pdf",
              "/group/n_2024_ee202/lecture/02_transient.pdf"
            ]
          },
          {
            id: "/group/n_2024_ee202/lecture/01_rlc.pdf",
            title: "01_RLC回路.pdf",
            type: "application/pdf",
            container: "/group/n_2024_ee202/lecture/",
            url: "#",
            size: 1835008,
            modifiedDate: "2024-04-08T09:00:00Z",
            numChildren: 0
          },
          {
            id: "/group/n_2024_ee202/lecture/02_transient.pdf",
            title: "02_過渡応答.pdf",
            type: "application/pdf",
            container: "/group/n_2024_ee202/lecture/",
            url: "#",
            size: 2097152,
            modifiedDate: "2024-04-15T09:00:00Z",
            numChildren: 0
          },
          {
            id: "/group/n_2024_ee202/exercise/",
            title: "演習問題",
            type: "collection",
            container: "/group/n_2024_ee202/",
            numChildren: 1,
            resourceChildren: [
              "/group/n_2024_ee202/exercise/ex05.pdf"
            ]
          },
          {
            id: "/group/n_2024_ee202/exercise/ex05.pdf",
            title: "演習問題5.pdf",
            type: "application/pdf",
            container: "/group/n_2024_ee202/exercise/",
            url: "#",
            size: 512000,
            modifiedDate: "2024-05-10T10:00:00Z",
            numChildren: 0
          }
        ]
      },

      "n_2024_ma201": {
        content_collection: [
          {
            id: "/group/n_2024_ma201/",
            title: "数学2及び演習",
            type: "collection",
            container: "/",
            numChildren: 2,
            resourceChildren: [
              "/group/n_2024_ma201/notes/",
              "/group/n_2024_ma201/exercise/"
            ]
          },
          {
            id: "/group/n_2024_ma201/notes/",
            title: "講義ノート",
            type: "collection",
            container: "/group/n_2024_ma201/",
            numChildren: 2,
            resourceChildren: [
              "/group/n_2024_ma201/notes/01_ode.pdf",
              "/group/n_2024_ma201/notes/02_vector_analysis.pdf"
            ]
          },
          {
            id: "/group/n_2024_ma201/notes/01_ode.pdf",
            title: "01_常微分方程式.pdf",
            type: "application/pdf",
            container: "/group/n_2024_ma201/notes/",
            url: "#",
            size: 1441792,
            modifiedDate: "2024-04-09T09:00:00Z",
            numChildren: 0
          },
          {
            id: "/group/n_2024_ma201/notes/02_vector_analysis.pdf",
            title: "02_ベクトル解析.pdf",
            type: "application/pdf",
            container: "/group/n_2024_ma201/notes/",
            url: "#",
            size: 1703936,
            modifiedDate: "2024-04-16T09:00:00Z",
            numChildren: 0
          },
          {
            id: "/group/n_2024_ma201/exercise/",
            title: "課題",
            type: "collection",
            container: "/group/n_2024_ma201/",
            numChildren: 1,
            resourceChildren: [
              "/group/n_2024_ma201/exercise/hw07.pdf"
            ]
          },
          {
            id: "/group/n_2024_ma201/exercise/hw07.pdf",
            title: "課題7.pdf",
            type: "application/pdf",
            container: "/group/n_2024_ma201/exercise/",
            url: "#",
            size: 409600,
            modifiedDate: "2024-05-14T10:00:00Z",
            numChildren: 0
          }
        ]
      },

      "n_2024_cs202": {
        content_collection: [
          {
            id: "/group/n_2024_cs202/",
            title: "オートマトンと形式言語",
            type: "collection",
            container: "/",
            numChildren: 1,
            resourceChildren: [
              "/group/n_2024_cs202/lecture/"
            ]
          },
          {
            id: "/group/n_2024_cs202/lecture/",
            title: "講義資料",
            type: "collection",
            container: "/group/n_2024_cs202/",
            numChildren: 2,
            resourceChildren: [
              "/group/n_2024_cs202/lecture/01_dfa.pdf",
              "/group/n_2024_cs202/lecture/02_cfg.pdf"
            ]
          },
          {
            id: "/group/n_2024_cs202/lecture/01_dfa.pdf",
            title: "01_決定性有限オートマトン.pdf",
            type: "application/pdf",
            container: "/group/n_2024_cs202/lecture/",
            url: "#",
            size: 1572864,
            modifiedDate: "2024-04-10T09:00:00Z",
            numChildren: 0
          },
          {
            id: "/group/n_2024_cs202/lecture/02_cfg.pdf",
            title: "02_文脈自由文法.pdf",
            type: "application/pdf",
            container: "/group/n_2024_cs202/lecture/",
            url: "#",
            size: 1835008,
            modifiedDate: "2024-04-17T09:00:00Z",
            numChildren: 0
          }
        ]
      },

      "n_2024_ph201": {
        content_collection: [
          {
            id: "/group/n_2024_ph201/",
            title: "電磁気学基礎演習",
            type: "collection",
            container: "/",
            numChildren: 1,
            resourceChildren: [
              "/group/n_2024_ph201/exercise/"
            ]
          },
          {
            id: "/group/n_2024_ph201/exercise/",
            title: "演習問題集",
            type: "collection",
            container: "/group/n_2024_ph201/",
            numChildren: 2,
            resourceChildren: [
              "/group/n_2024_ph201/exercise/ex_coulomb.pdf",
              "/group/n_2024_ph201/exercise/ex_gauss.pdf"
            ]
          },
          {
            id: "/group/n_2024_ph201/exercise/ex_coulomb.pdf",
            title: "クーロン力演習.pdf",
            type: "application/pdf",
            container: "/group/n_2024_ph201/exercise/",
            url: "#",
            size: 512000,
            modifiedDate: "2024-04-12T10:00:00Z",
            numChildren: 0
          },
          {
            id: "/group/n_2024_ph201/exercise/ex_gauss.pdf",
            title: "ガウスの法則演習.pdf",
            type: "application/pdf",
            container: "/group/n_2024_ph201/exercise/",
            url: "#",
            size: 614400,
            modifiedDate: "2024-04-19T10:00:00Z",
            numChildren: 0
          }
        ]
      },

      "n_2024_ph202": {
        content_collection: [
          {
            id: "/group/n_2024_ph202/",
            title: "量子力学及び演習",
            type: "collection",
            container: "/",
            numChildren: 1,
            resourceChildren: [
              "/group/n_2024_ph202/notes/"
            ]
          },
          {
            id: "/group/n_2024_ph202/notes/",
            title: "講義ノート",
            type: "collection",
            container: "/group/n_2024_ph202/",
            numChildren: 2,
            resourceChildren: [
              "/group/n_2024_ph202/notes/01_schrodinger.pdf",
              "/group/n_2024_ph202/notes/02_harmonic.pdf"
            ]
          },
          {
            id: "/group/n_2024_ph202/notes/01_schrodinger.pdf",
            title: "01_シュレーディンガー方程式.pdf",
            type: "application/pdf",
            container: "/group/n_2024_ph202/notes/",
            url: "#",
            size: 1966080,
            modifiedDate: "2024-04-11T09:00:00Z",
            numChildren: 0
          },
          {
            id: "/group/n_2024_ph202/notes/02_harmonic.pdf",
            title: "02_調和振動子.pdf",
            type: "application/pdf",
            container: "/group/n_2024_ph202/notes/",
            url: "#",
            size: 2228224,
            modifiedDate: "2024-04-18T09:00:00Z",
            numChildren: 0
          }
        ]
      },

      "n_2024_ge201": {
        content_collection: [
          {
            id: "/group/n_2024_ge201/",
            title: "文化・芸術学入門",
            type: "collection",
            container: "/",
            numChildren: 1,
            resourceChildren: [
              "/group/n_2024_ge201/materials/"
            ]
          },
          {
            id: "/group/n_2024_ge201/materials/",
            title: "授業資料",
            type: "collection",
            container: "/group/n_2024_ge201/",
            numChildren: 2,
            resourceChildren: [
              "/group/n_2024_ge201/materials/01_overview.pdf",
              "/group/n_2024_ge201/materials/02_modern_art.pdf"
            ]
          },
          {
            id: "/group/n_2024_ge201/materials/01_overview.pdf",
            title: "01_芸術学概論.pdf",
            type: "application/pdf",
            container: "/group/n_2024_ge201/materials/",
            url: "#",
            size: 1310720,
            modifiedDate: "2024-04-08T09:00:00Z",
            numChildren: 0
          },
          {
            id: "/group/n_2024_ge201/materials/02_modern_art.pdf",
            title: "02_近現代美術.pdf",
            type: "application/pdf",
            container: "/group/n_2024_ge201/materials/",
            url: "#",
            size: 1572864,
            modifiedDate: "2024-04-15T09:00:00Z",
            numChildren: 0
          }
        ]
      }
    },

    announcements: {
      "n_2024_cs201": [
        {
          id: "ann_2024_prog_1",
          title: "演習#10の提出について",
          body: "演習#10はTACTの課題機能から提出してください。ソースファイル（.c）と実行結果のスクリーンショットを含めること。",
          createdOn: Date.now() - 86400000,
          siteId: "n_2024_cs201"
        }
      ],
      "n_2024_ee201": [
        {
          id: "ann_2024_ee_1",
          title: "小テスト第6回の範囲について",
          body: "第6回小テストはトランジスタの直流バイアス設計（第10・11回講義内容）から出題します。",
          createdOn: Date.now() - 172800000,
          siteId: "n_2024_ee201"
        }
      ],
      "n_2024_cs202": [
        {
          id: "ann_2024_auto_1",
          title: "期末レポートの課題を公開しました",
          body: "期末レポートの課題をTACTに掲載しました。「プッシュダウンオートマトンと文脈自由言語の関係」について論じてください。",
          createdOn: Date.now() - 345600000,
          siteId: "n_2024_cs202"
        }
      ]
    }
  },

  /* =========================================================
   * 2023年度（1年生・教養）
   * ========================================================= */
  "2023": {
    term: "春",

    courses: [
      {
        id: "n_2023_en101",
        name: "英語（基礎）(2023年度春/火1限)",
        shortName: "英語（基礎）",
        period: { day: 2, period: 1 },
        instructor: "Smith, John",
        description: "基礎的な英語力の向上"
      },
      {
        id: "n_2023_ma101",
        name: "線形代数学I(2023年度春/月3限)",
        shortName: "線形代数学I",
        period: { day: 1, period: 3 },
        instructor: "佐々木 一郎",
        description: "行列とベクトル空間"
      },
      {
        id: "n_2023_ma102",
        name: "微分積分学I(2023年度春/火4限)",
        shortName: "微分積分学I",
        period: { day: 2, period: 4 },
        instructor: "山本 二郎",
        description: "一変数関数の微積分"
      },
      {
        id: "n_2023_ch101",
        name: "化学基礎I(2023年度春/水1限)",
        shortName: "化学基礎I",
        period: { day: 3, period: 1 },
        instructor: "中島 三郎",
        description: "化学結合と反応速度論"
      },
      {
        id: "n_2023_ph101",
        name: "力学I(2023年度春/木2限)",
        shortName: "力学I",
        period: { day: 4, period: 2 },
        instructor: "前田 四郎",
        description: "ニュートン力学の基礎"
      },
      {
        id: "n_2023_ge101",
        name: "基礎セミナー(2023年度春/月5限)",
        shortName: "基礎セミナー",
        period: { day: 1, period: 5 },
        instructor: "藤田 五郎",
        description: "大学での学びの基礎"
      },
      {
        id: "n_2023_cs101",
        name: "離散数学及び演習(2023年度春/金1限,金2限)",
        shortName: "離散数学及び演習",
        period: { day: 5, period: 1 },
        instructor: "石川 六郎",
        description: "集合、論理、グラフ理論"
      },
      {
        id: "n_2023_cs102",
        name: "計算機プログラミング基礎(2023年度春/金3限,金4限)",
        shortName: "計算機プログラミング基礎",
        period: { day: 5, period: 3 },
        instructor: "後藤 七郎",
        description: "Python入門"
      }
    ],

    assignments: [
      {
        id: "2023_a1",
        title: "英語 Vocabulary Test 10",
        type: "quiz",
        dueOffset: { hours: 10 },
        closeOffset: { hours: 10 },
        courseId: "n_2023_en101",
        submitted: false
      },
      {
        id: "2023_a2",
        title: "線形代数 演習問題6",
        type: "assignment",
        dueOffset: { hours: 48 },
        closeOffset: { hours: 48 },
        courseId: "n_2023_ma101",
        submitted: false
      },
      {
        id: "2023_a3",
        title: "化学基礎 レポート#3",
        type: "assignment",
        dueOffset: { hours: 120 },
        closeOffset: { hours: 120 },
        courseId: "n_2023_ch101",
        submitted: false
      },
      {
        id: "2023_a4",
        title: "力学 期末レポート",
        type: "assignment",
        dueOffset: { hours: 360 },
        closeOffset: { hours: 360 },
        courseId: "n_2023_ph101",
        submitted: false
      },
      {
        id: "2023_a5",
        title: "離散数学 最終課題",
        type: "assignment",
        dueOffset: { hours: 480 },
        closeOffset: { hours: 480 },
        courseId: "n_2023_cs101",
        submitted: false
      }
    ],

    submitted: [],

    fileTree: {
      "n_2023_en101": {
        content_collection: [
          {
            id: "/group/n_2023_en101/",
            title: "英語（基礎）",
            type: "collection",
            container: "/",
            numChildren: 1,
            resourceChildren: [
              "/group/n_2023_en101/materials/"
            ]
          },
          {
            id: "/group/n_2023_en101/materials/",
            title: "授業資料",
            type: "collection",
            container: "/group/n_2023_en101/",
            numChildren: 2,
            resourceChildren: [
              "/group/n_2023_en101/materials/syllabus.pdf",
              "/group/n_2023_en101/materials/vocab_unit1.pdf"
            ]
          },
          {
            id: "/group/n_2023_en101/materials/syllabus.pdf",
            title: "シラバス.pdf",
            type: "application/pdf",
            container: "/group/n_2023_en101/materials/",
            url: "#",
            size: 307200,
            modifiedDate: "2023-04-04T09:00:00Z",
            numChildren: 0
          },
          {
            id: "/group/n_2023_en101/materials/vocab_unit1.pdf",
            title: "Vocabulary Unit 1.pdf",
            type: "application/pdf",
            container: "/group/n_2023_en101/materials/",
            url: "#",
            size: 409600,
            modifiedDate: "2023-04-11T09:00:00Z",
            numChildren: 0
          }
        ]
      },

      "n_2023_ma101": {
        content_collection: [
          {
            id: "/group/n_2023_ma101/",
            title: "線形代数学I",
            type: "collection",
            container: "/",
            numChildren: 2,
            resourceChildren: [
              "/group/n_2023_ma101/lecture/",
              "/group/n_2023_ma101/exercise/"
            ]
          },
          {
            id: "/group/n_2023_ma101/lecture/",
            title: "講義ノート",
            type: "collection",
            container: "/group/n_2023_ma101/",
            numChildren: 2,
            resourceChildren: [
              "/group/n_2023_ma101/lecture/01_matrix.pdf",
              "/group/n_2023_ma101/lecture/02_vector_space.pdf"
            ]
          },
          {
            id: "/group/n_2023_ma101/lecture/01_matrix.pdf",
            title: "01_行列と行列式.pdf",
            type: "application/pdf",
            container: "/group/n_2023_ma101/lecture/",
            url: "#",
            size: 1310720,
            modifiedDate: "2023-04-10T09:00:00Z",
            numChildren: 0
          },
          {
            id: "/group/n_2023_ma101/lecture/02_vector_space.pdf",
            title: "02_ベクトル空間.pdf",
            type: "application/pdf",
            container: "/group/n_2023_ma101/lecture/",
            url: "#",
            size: 1572864,
            modifiedDate: "2023-04-17T09:00:00Z",
            numChildren: 0
          },
          {
            id: "/group/n_2023_ma101/exercise/",
            title: "演習問題",
            type: "collection",
            container: "/group/n_2023_ma101/",
            numChildren: 1,
            resourceChildren: [
              "/group/n_2023_ma101/exercise/ex06.pdf"
            ]
          },
          {
            id: "/group/n_2023_ma101/exercise/ex06.pdf",
            title: "演習問題6.pdf",
            type: "application/pdf",
            container: "/group/n_2023_ma101/exercise/",
            url: "#",
            size: 512000,
            modifiedDate: "2023-05-08T10:00:00Z",
            numChildren: 0
          }
        ]
      },

      "n_2023_ma102": {
        content_collection: [
          {
            id: "/group/n_2023_ma102/",
            title: "微分積分学I",
            type: "collection",
            container: "/",
            numChildren: 1,
            resourceChildren: [
              "/group/n_2023_ma102/notes/"
            ]
          },
          {
            id: "/group/n_2023_ma102/notes/",
            title: "講義ノート",
            type: "collection",
            container: "/group/n_2023_ma102/",
            numChildren: 2,
            resourceChildren: [
              "/group/n_2023_ma102/notes/01_limit.pdf",
              "/group/n_2023_ma102/notes/02_derivative.pdf"
            ]
          },
          {
            id: "/group/n_2023_ma102/notes/01_limit.pdf",
            title: "01_極限と連続性.pdf",
            type: "application/pdf",
            container: "/group/n_2023_ma102/notes/",
            url: "#",
            size: 1179648,
            modifiedDate: "2023-04-10T09:00:00Z",
            numChildren: 0
          },
          {
            id: "/group/n_2023_ma102/notes/02_derivative.pdf",
            title: "02_微分法.pdf",
            type: "application/pdf",
            container: "/group/n_2023_ma102/notes/",
            url: "#",
            size: 1441792,
            modifiedDate: "2023-04-17T09:00:00Z",
            numChildren: 0
          }
        ]
      },

      "n_2023_ch101": {
        content_collection: [
          {
            id: "/group/n_2023_ch101/",
            title: "化学基礎I",
            type: "collection",
            container: "/",
            numChildren: 2,
            resourceChildren: [
              "/group/n_2023_ch101/lecture/",
              "/group/n_2023_ch101/report/"
            ]
          },
          {
            id: "/group/n_2023_ch101/lecture/",
            title: "講義資料",
            type: "collection",
            container: "/group/n_2023_ch101/",
            numChildren: 2,
            resourceChildren: [
              "/group/n_2023_ch101/lecture/01_bond.pdf",
              "/group/n_2023_ch101/lecture/02_kinetics.pdf"
            ]
          },
          {
            id: "/group/n_2023_ch101/lecture/01_bond.pdf",
            title: "01_化学結合.pdf",
            type: "application/pdf",
            container: "/group/n_2023_ch101/lecture/",
            url: "#",
            size: 1572864,
            modifiedDate: "2023-04-10T09:00:00Z",
            numChildren: 0
          },
          {
            id: "/group/n_2023_ch101/lecture/02_kinetics.pdf",
            title: "02_反応速度論.pdf",
            type: "application/pdf",
            container: "/group/n_2023_ch101/lecture/",
            url: "#",
            size: 1835008,
            modifiedDate: "2023-04-17T09:00:00Z",
            numChildren: 0
          },
          {
            id: "/group/n_2023_ch101/report/",
            title: "レポート課題",
            type: "collection",
            container: "/group/n_2023_ch101/",
            numChildren: 1,
            resourceChildren: [
              "/group/n_2023_ch101/report/report03_guideline.pdf"
            ]
          },
          {
            id: "/group/n_2023_ch101/report/report03_guideline.pdf",
            title: "レポート3課題要項.pdf",
            type: "application/pdf",
            container: "/group/n_2023_ch101/report/",
            url: "#",
            size: 358400,
            modifiedDate: "2023-05-10T10:00:00Z",
            numChildren: 0
          }
        ]
      },

      "n_2023_ph101": {
        content_collection: [
          {
            id: "/group/n_2023_ph101/",
            title: "力学I",
            type: "collection",
            container: "/",
            numChildren: 1,
            resourceChildren: [
              "/group/n_2023_ph101/lecture/"
            ]
          },
          {
            id: "/group/n_2023_ph101/lecture/",
            title: "講義資料",
            type: "collection",
            container: "/group/n_2023_ph101/",
            numChildren: 2,
            resourceChildren: [
              "/group/n_2023_ph101/lecture/01_newton.pdf",
              "/group/n_2023_ph101/lecture/02_energy.pdf"
            ]
          },
          {
            id: "/group/n_2023_ph101/lecture/01_newton.pdf",
            title: "01_ニュートンの運動方程式.pdf",
            type: "application/pdf",
            container: "/group/n_2023_ph101/lecture/",
            url: "#",
            size: 1441792,
            modifiedDate: "2023-04-10T09:00:00Z",
            numChildren: 0
          },
          {
            id: "/group/n_2023_ph101/lecture/02_energy.pdf",
            title: "02_仕事とエネルギー.pdf",
            type: "application/pdf",
            container: "/group/n_2023_ph101/lecture/",
            url: "#",
            size: 1703936,
            modifiedDate: "2023-04-17T09:00:00Z",
            numChildren: 0
          }
        ]
      },

      "n_2023_ge101": {
        content_collection: [
          {
            id: "/group/n_2023_ge101/",
            title: "基礎セミナー",
            type: "collection",
            container: "/",
            numChildren: 1,
            resourceChildren: [
              "/group/n_2023_ge101/materials/"
            ]
          },
          {
            id: "/group/n_2023_ge101/materials/",
            title: "授業資料",
            type: "collection",
            container: "/group/n_2023_ge101/",
            numChildren: 2,
            resourceChildren: [
              "/group/n_2023_ge101/materials/orientation.pdf",
              "/group/n_2023_ge101/materials/library_guide.pdf"
            ]
          },
          {
            id: "/group/n_2023_ge101/materials/orientation.pdf",
            title: "オリエンテーション資料.pdf",
            type: "application/pdf",
            container: "/group/n_2023_ge101/materials/",
            url: "#",
            size: 819200,
            modifiedDate: "2023-04-04T09:00:00Z",
            numChildren: 0
          },
          {
            id: "/group/n_2023_ge101/materials/library_guide.pdf",
            title: "図書館利用ガイド.pdf",
            type: "application/pdf",
            container: "/group/n_2023_ge101/materials/",
            url: "#",
            size: 614400,
            modifiedDate: "2023-04-04T09:00:00Z",
            numChildren: 0
          }
        ]
      },

      "n_2023_cs101": {
        content_collection: [
          {
            id: "/group/n_2023_cs101/",
            title: "離散数学及び演習",
            type: "collection",
            container: "/",
            numChildren: 2,
            resourceChildren: [
              "/group/n_2023_cs101/lecture/",
              "/group/n_2023_cs101/exercise/"
            ]
          },
          {
            id: "/group/n_2023_cs101/lecture/",
            title: "講義資料",
            type: "collection",
            container: "/group/n_2023_cs101/",
            numChildren: 2,
            resourceChildren: [
              "/group/n_2023_cs101/lecture/01_logic.pdf",
              "/group/n_2023_cs101/lecture/02_graph.pdf"
            ]
          },
          {
            id: "/group/n_2023_cs101/lecture/01_logic.pdf",
            title: "01_命題論理.pdf",
            type: "application/pdf",
            container: "/group/n_2023_cs101/lecture/",
            url: "#",
            size: 1310720,
            modifiedDate: "2023-04-14T09:00:00Z",
            numChildren: 0
          },
          {
            id: "/group/n_2023_cs101/lecture/02_graph.pdf",
            title: "02_グラフ理論入門.pdf",
            type: "application/pdf",
            container: "/group/n_2023_cs101/lecture/",
            url: "#",
            size: 1572864,
            modifiedDate: "2023-04-21T09:00:00Z",
            numChildren: 0
          },
          {
            id: "/group/n_2023_cs101/exercise/",
            title: "最終課題",
            type: "collection",
            container: "/group/n_2023_cs101/",
            numChildren: 1,
            resourceChildren: [
              "/group/n_2023_cs101/exercise/final_assignment.pdf"
            ]
          },
          {
            id: "/group/n_2023_cs101/exercise/final_assignment.pdf",
            title: "最終課題要項.pdf",
            type: "application/pdf",
            container: "/group/n_2023_cs101/exercise/",
            url: "#",
            size: 512000,
            modifiedDate: "2023-06-01T10:00:00Z",
            numChildren: 0
          }
        ]
      },

      "n_2023_cs102": {
        content_collection: [
          {
            id: "/group/n_2023_cs102/",
            title: "計算機プログラミング基礎",
            type: "collection",
            container: "/",
            numChildren: 1,
            resourceChildren: [
              "/group/n_2023_cs102/lecture/"
            ]
          },
          {
            id: "/group/n_2023_cs102/lecture/",
            title: "講義資料",
            type: "collection",
            container: "/group/n_2023_cs102/",
            numChildren: 2,
            resourceChildren: [
              "/group/n_2023_cs102/lecture/01_python_intro.pdf",
              "/group/n_2023_cs102/lecture/02_control_flow.pdf"
            ]
          },
          {
            id: "/group/n_2023_cs102/lecture/01_python_intro.pdf",
            title: "01_Python入門.pdf",
            type: "application/pdf",
            container: "/group/n_2023_cs102/lecture/",
            url: "#",
            size: 1179648,
            modifiedDate: "2023-04-14T09:00:00Z",
            numChildren: 0
          },
          {
            id: "/group/n_2023_cs102/lecture/02_control_flow.pdf",
            title: "02_制御構造.pdf",
            type: "application/pdf",
            container: "/group/n_2023_cs102/lecture/",
            url: "#",
            size: 1441792,
            modifiedDate: "2023-04-21T09:00:00Z",
            numChildren: 0
          }
        ]
      }
    },

    announcements: {
      "n_2023_en101": [
        {
          id: "ann_2023_en_1",
          title: "Vocabulary Test 10 について",
          body: "次回授業（火曜1限）の最初15分でVocabulary Test 10を実施します。Unit 9・10の単語を復習しておいてください。",
          createdOn: Date.now() - 86400000,
          siteId: "n_2023_en101"
        }
      ],
      "n_2023_ma101": [
        {
          id: "ann_2023_la_1",
          title: "演習問題6の提出期限について",
          body: "演習問題6はTACTの課題機能から提出してください。手書きの場合はスキャンしてPDFで提出すること。",
          createdOn: Date.now() - 172800000,
          siteId: "n_2023_ma101"
        }
      ],
      "n_2023_ch101": [
        {
          id: "ann_2023_ch_1",
          title: "化学基礎レポート#3の課題を掲載しました",
          body: "レポート#3のテーマは「アレニウス式と活性化エネルギー」です。課題ページの要項をよく読んで作成してください。",
          createdOn: Date.now() - 432000000,
          siteId: "n_2023_ch101"
        }
      ]
    }
  }
};

/* =========================================================
 * API レスポンス変換ヘルパー
 * demo-shim.js から呼び出される
 * ========================================================= */

window.DEMO_HELPERS = {
  /**
   * dueOffset を実際のタイムスタンプ（ミリ秒）に変換する。
   * dueOffset が存在しない場合は dueTime をそのまま返す。
   * @param {object} assignment
   * @returns {number} Unix タイムスタンプ（ms）
   */
  resolveDueTime: function (assignment) {
    var now = Date.now();
    if (assignment.dueOffset) {
      return now + (assignment.dueOffset.hours || 0) * 3600000;
    }
    return assignment.dueTime || now;
  },

  getCourses: function (year) {
    var data = window.DEMO_DATA[String(year)];
    return data ? data.courses : [];
  },

  getActiveAssignments: function (year) {
    var data = window.DEMO_DATA[String(year)];
    if (!data) return [];
    return (data.assignments || []).filter(function (a) { return !a.submitted; });
  },

  getFileTree: function (year, courseId) {
    var data = window.DEMO_DATA[String(year)];
    if (!data || !data.fileTree || !data.fileTree[courseId]) return [];
    return data.fileTree[courseId].content_collection || [];
  },

  getAllAnnouncements: function (year) {
    var data = window.DEMO_DATA[String(year)];
    if (!data || !data.announcements) return [];
    var result = [];
    var anns = data.announcements;
    Object.keys(anns).forEach(function (courseId) {
      (anns[courseId] || []).forEach(function (ann) {
        result.push(ann);
      });
    });
    return result;
  },

  getAnnouncements: function (year, courseId) {
    var data = window.DEMO_DATA[String(year)];
    if (!data || !data.announcements) return [];
    return data.announcements[courseId] || [];
  }
};

console.log('[Demo Data] Loaded', Object.keys(window.DEMO_DATA).length, 'years of data');
