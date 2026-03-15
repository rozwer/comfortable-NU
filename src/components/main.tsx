import React, { useContext } from "react";
import { useTranslation } from "./helper";
import { createLogger } from "../utils/logger";
import { formatTimestamp, getEntities, updateIsReadFlag } from "../utils";

const logger = createLogger('main');
import { EntityUnion, EntryTab, EntryUnion, MemoAddInfo } from "./entryTab";
import { SettingsChange, SettingsTab } from "./settings";
import { SubmittedEntryList } from "./submittedEntryList";
import { DismissedEntryList } from "./dismissedEntryList";
import _ from "lodash";
import { applyColorSettings, toggleMiniSakai } from "../minisakai";
import { Settings } from "../features/setting/types";
import { getStoredSettings } from "../features/setting/getSetting";
import { saveSettings } from "../features/setting/saveSetting";
import { addFavoritedCourseSites } from "../features/favorite";
import { getBaseURL } from "../features/api/fetch";
import { v4 as uuidv4 } from "uuid";
import { MemoEntry } from "../features/entity/memo/types";
import { removeMemoEntry, saveNewMemoEntry } from "../features/entity/memo/saveMemo";
import { createFavoritesBar, resetFavoritesBar } from "./favoritesBar";
import { getSakaiCourses } from "../features/course/getCourse";
import { DatepickerModal } from "./datepickerModal";
import { i18nMessage } from "../features/chrome/index";

export const MiniSakaiContext = React.createContext<{
    settings: Settings;
}>({
    settings: new Settings()
});

type MiniSakaiRootProps = { subset: boolean; hostname: string };
/**
 * -----------------------------------------------------------------
 * Modified by: roz
 * Date       : 2025-05-19
 * Changes    : 提出済み・非表示タブのステート対応を追加
 * Category   : タイプ拡張
 * -----------------------------------------------------------------
 */
type MiniSakaiRootState = {
    settings: Settings;
    entities: EntityUnion[];
    /**
     * -----------------------------------------------------------------
     * Modified by: roz
     * Date       : 2025-05-19
     * Changes    : フィルタリングされたエントリを保持する状態を追加
     * Category   : 状態管理
     * -----------------------------------------------------------------
     */
    filteredEntities: {
        submitted: EntryUnion[];
        dismissed: EntryUnion[];
    };
    shownTab: "assignment" | "settings" | "submitted" | "dismissed";
    memoBoxShown: boolean;
    /**
     * -----------------------------------------------------------------
     * Modified by: roz
     * Date       : 2025-05-20
     * Changes    : 提出済みタブ用のメモボックス表示状態を追加
     * Category   : 状態管理
     * -----------------------------------------------------------------
     */
    submittedMemoBoxShown: boolean; // 提出済みタブ用のメモボックス表示状態
    /**
     * -----------------------------------------------------------------
     * Added by: roz
     * Date       : 2025-05-20
     * Changes    : 非表示タブ用のメモボックス表示状態を追加
     * Category   : 状態管理
     * -----------------------------------------------------------------
     */
    dismissedMemoBoxShown: boolean; // 非表示タブ用のメモボックス表示状態
    /**
     * -----------------------------------------------------------------
     * Added by: roz
     * Date       : 2025-05-20
     * Changes    : 選択された非表示エントリを追加
     * Category   : 状態管理
     * -----------------------------------------------------------------
     */
    selectedDismissedEntry: EntryUnion | null; // 選択された非表示エントリ
    /**
     * -----------------------------------------------------------------
     * Added by: roz
     * Date       : 2025-05-20
     * Changes    : 日付ピッカーモーダルの状態を追加
     * Category   : 状態管理
     * -----------------------------------------------------------------
     */
    datepickerModalOpen: boolean; // 日付ピッカーモーダルの表示状態
    currentEntry: EntryUnion | null; // 日付設定対象のエントリ
};

export class MiniSakaiRoot extends React.Component<MiniSakaiRootProps, MiniSakaiRootState> {
    private handleSubmittedTabClick: () => void;
    private handleDismissedTabClick: () => void;

    constructor(props: MiniSakaiRootProps) {
        super(props);
        this.state = {
            settings: new Settings(),
            entities: new Array<EntityUnion>(),
            filteredEntities: {
                submitted: [],
                dismissed: []
            },
            shownTab: "assignment",
            memoBoxShown: false,
            submittedMemoBoxShown: false,
            dismissedMemoBoxShown: false,
            selectedDismissedEntry: null,
            datepickerModalOpen: false,
            currentEntry: null
        };

        this.onCheck = this.onCheck.bind(this);
        this.onMemoAdd = this.onMemoAdd.bind(this);
        this.onMemoDelete = this.onMemoDelete.bind(this);
        this.onSettingsChange = this.onSettingsChange.bind(this);

        this.handleSubmittedTabClick = () => { this.setState({ shownTab: "submitted" }); };
        this.handleDismissedTabClick = () => { this.setState({ shownTab: "dismissed" }); };
    }

    componentDidMount() {
        /**
         * -----------------------------------------------------------------
         * Modified by: roz
         * Date       : 2025-05-19
         * Changes    : タブクリックイベントリスナーの追加
         * Category   : イベント処理
         * -----------------------------------------------------------------
         */
        // 提出済みタブクリック時のイベントリスナーを登録
        document.addEventListener('submittedTabClick', this.handleSubmittedTabClick);

        // 非表示タブクリック時のイベントリスナーを登録
        document.addEventListener('dismissedTabClick', this.handleDismissedTabClick);
        
        /**
         * -----------------------------------------------------------------
         * Added by: GitHub Copilot
         * Date       : 2025-05-20
         * Changes    : 日付ピッカー用のCSSを動的に読み込み
         * Category   : UI改善
         * -----------------------------------------------------------------
         */
        // 日付ピッカー用のCSSを動的に読み込む
        this.loadDatePickerCSS();
        
        getStoredSettings(this.props.hostname).then((s) => {
            this.setState({ settings: s }, () => {
                this.reloadEntities();
            });
        });
    }
    
    /**
     * -----------------------------------------------------------------
     * Added by: GitHub Copilot
     * Date       : 2025-05-20
     * Changes    : 日付ピッカー用のCSSを動的に読み込む関数を追加
     * Category   : UI改善
     * -----------------------------------------------------------------
     */
    private loadDatePickerCSS() {
        // すでに読み込まれているかチェック
        if (!document.querySelector('link[href*="date-picker.css"]')) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.type = 'text/css';
            link.href = chrome.runtime.getURL('css/date-picker.css');
            document.head.appendChild(link);
        }
    }
    
    componentWillUnmount() {
        /**
         * -----------------------------------------------------------------
         * Modified by: roz
         * Date       : 2025-05-19
         * Changes    : イベントリスナーのクリーンアップ
         * Category   : イベント処理
         * -----------------------------------------------------------------
         */
        // イベントリスナーを削除
        document.removeEventListener('submittedTabClick', this.handleSubmittedTabClick);
        document.removeEventListener('dismissedTabClick', this.handleDismissedTabClick);
    }

    /**
     * -----------------------------------------------------------------
     * Modified by: roz
     * Date       : 2025-05-19
     * Changes    : エンティティのロード時に提出済み・非表示課題のフィルタリングを追加
     * Category   : 機能拡張
     * -----------------------------------------------------------------
     */
    reloadEntities() {
        const cacheOnly = this.props.subset;
        getEntities(this.state.settings, getSakaiCourses(), cacheOnly).then((entities) => {
            const allEntities = [...entities.assignment, ...entities.quiz, ...entities.memo];
            
            // すべてのエントリーを抽出
            const allEntries = allEntities.flatMap((entity) => {
                return entity.getEntries().map(entry => {
                    return {
                        entry,
                        course: entity.getCourse()
                    };
                });
            });
            
            // 提出済みの課題を抽出（Assignment: submitted, Quiz: hasFinished）
            const submittedEntries = allEntries
                .filter(item => (item.entry as any).submitted === true || (item.entry as any).hasFinished === true)
                .map(item => item.entry);
            
            // 非表示の課題を抽出
            // checkTimestampが現時刻より後であれば非表示タブに振り分け
            const dismissedEntries = allEntries
                .filter(item => {
                    const checkTimestamp = (item.entry as any).checkTimestamp;
                    if (!checkTimestamp) return false;

                    try {
                        let checkTimeMs: number;
                        if (typeof checkTimestamp === 'number') {
                            // Unix timestamp (ms)
                            checkTimeMs = checkTimestamp;
                        } else if (typeof checkTimestamp === 'string' && checkTimestamp.includes('/')) {
                            // レガシーフォーマット: yyyy/mm/dd/hh
                            const parts = checkTimestamp.split('/');
                            if (parts.length !== 4) return false;
                            checkTimeMs = new Date(
                                parseInt(parts[0]),
                                parseInt(parts[1]) - 1,
                                parseInt(parts[2]),
                                parseInt(parts[3])
                            ).getTime();
                        } else {
                            // ISO文字列またはDatepickerModal出力
                            checkTimeMs = new Date(checkTimestamp).getTime();
                        }
                        if (isNaN(checkTimeMs)) return false;
                        return checkTimeMs > Date.now();
                    } catch (e) {
                        logger.error("Invalid timestamp format:", e);
                        return false;
                    }
                })
                .map(item => item.entry);
            
            this.setState({
                entities: allEntities,
                filteredEntities: {
                    submitted: submittedEntries,
                    dismissed: dismissedEntries
                }
            });
            updateIsReadFlag(window.location.href, entities.assignment, this.props.hostname);
        }).catch((err) => {
            logger.error("Failed to load entities:", err);
        });
    }

    /**
     * -----------------------------------------------------------------
     * Modified by: GitHub Copilot
     * Date       : 2025-05-20
     * Changes    : 日付入力をDatepickerModalを使用する形に変更
     * Category   : UI改善
     * -----------------------------------------------------------------
     */
    private onCheck(entry: EntryUnion, checked: boolean, requestDate?: boolean) {
        const newEntry = _.cloneDeep(entry);
        
        // マイナスボタンをクリックした時の処理（日付ピッカーを表示）
        if (requestDate) {
            // 日付ピッカーモーダルを表示するための状態をセット
            this.setState({
                datepickerModalOpen: true,
                currentEntry: entry
            });
            return; // モーダルでの操作が完了するまで保存せず終了
        } else {
            // checkTimestampを削除
            (newEntry as any).checkTimestamp = undefined;
            
            newEntry.save(this.props.hostname).then(() => {
                this.reloadEntities();
            });
        }
    }
    
    /**
     * -----------------------------------------------------------------
     * Added by: GitHub Copilot
     * Date       : 2025-05-20
     * Changes    : 日付ピッカーモーダルでの保存処理を追加
     * Category   : UI改善
     * -----------------------------------------------------------------
     */
    private handleDatepickerSave = (dateString: string) => {
        if (this.state.currentEntry) {
            const newEntry = _.cloneDeep(this.state.currentEntry);
            // 入力された日時を保存
            (newEntry as any).checkTimestamp = dateString;
            
            newEntry.save(this.props.hostname).then(() => {
                // モーダルを閉じて状態をクリア
                this.setState({
                    datepickerModalOpen: false,
                    currentEntry: null
                }, () => {
                    this.reloadEntities();
                });
            });
        }
    }
    
    /**
     * -----------------------------------------------------------------
     * Added by: GitHub Copilot
     * Date       : 2025-05-20
     * Changes    : 日付ピッカーモーダルを閉じる処理を追加
     * Category   : UI改善
     * -----------------------------------------------------------------
     */
    private handleDatepickerClose = () => {
        this.setState({
            datepickerModalOpen: false,
            currentEntry: null
        });
    }

    private onMemoAdd(memo: MemoAddInfo) {
        const newMemo = new MemoEntry(uuidv4(), memo.content, memo.due, false);
        saveNewMemoEntry(this.state.settings.appInfo.hostname, newMemo, memo.course).then(() => {
            // メモ追加後にメモボックスを閉じる
            this.setState({
                memoBoxShown: false,
                submittedMemoBoxShown: false,
                dismissedMemoBoxShown: false
            }, () => {
                this.reloadEntities();
            });
        });
    }

    private onMemoDelete(entry: EntryUnion) {
        removeMemoEntry(this.state.settings.appInfo.hostname, entry as MemoEntry).then(() => {
            this.reloadEntities();
        });
    }

    private onSettingsChange(change: SettingsChange) {
        const newSettings = _.cloneDeep(this.state.settings);
        if (change.type === "reset-color") {
            const _settings = new Settings();
            newSettings.color = _settings.color;
            saveSettings(this.state.settings.appInfo.hostname, newSettings).then(() => {
                this.setState({
                    settings: newSettings
                });
                // 色設定をリセット後に適用
                applyColorSettings(newSettings, this.props.subset);
                // 時間割モーダルにも色設定を適用
                this.applyColorsToTimetableModal(newSettings);
            });
            return;
        }

        _.set(newSettings, change.id, change.newValue);
        saveSettings(this.state.settings.appInfo.hostname, newSettings).then(() => {
            this.setState({
                settings: newSettings
            });
            // 設定変更後に色設定を適用
            applyColorSettings(newSettings, this.props.subset);
            // 時間割モーダルにも色設定を適用
            this.applyColorsToTimetableModal(newSettings);
        });
    }

    /**
     * 時間割モーダルに色設定を適用する
     */
    private applyColorsToTimetableModal(settings: Settings) {
        const timetableModal = document.querySelector('.cs-timetable-modal') as HTMLElement;
        if (timetableModal) {
            for (const colorName of Object.getOwnPropertyNames(settings.color)) {
                // @ts-ignore
                const color = settings.color[colorName];
                timetableModal.style.setProperty(`--${colorName}`, color);
            }
            timetableModal.style.setProperty("--textColor", settings.getTextColor());
            timetableModal.style.setProperty("--bgColor", settings.getBgColor());
            timetableModal.style.setProperty("--dateColor", settings.getDateColor());
            logger.debug(i18nMessage('color_settings_updated'));
        }
    }

    componentDidUpdate(prevProps: MiniSakaiRootProps, prevState: MiniSakaiRootState) {
        if (!_.isEqual(prevState.entities, this.state.entities)) {
            getStoredSettings(this.props.hostname).then((s) => {
                this.setState({
                    settings: s
                });
                addFavoritedCourseSites(getBaseURL()).then(() => {
                    resetFavoritesBar();
                    createFavoritesBar(s, this.state.entities);
                }).catch((err) => {
                    logger.error("Failed to add favorited course sites:", err);
                });
            });
        }
        if (!_.isEqual(prevState.settings, this.state.settings)) {
            resetFavoritesBar();
            createFavoritesBar(this.state.settings, this.state.entities);
            applyColorSettings(this.state.settings, this.props.subset);
        }
    }

    render(): React.ReactNode {
        const entryTabShown = this.state.shownTab === "assignment";
        const settingsTabShown = this.state.shownTab === "settings";

        return (
            <MiniSakaiContext.Provider
                value={{
                    settings: this.state.settings
                }}
            >
                <MiniSakaiLogo />
                <MiniSakaiVersion />
                {this.props.subset ? null : (
                    <>
                        <MiniSakaiClose onClose={() => toggleMiniSakai()} />
                        <MiniSakaiTabs
                            onAssignment={() =>
                                this.setState({ shownTab: "assignment" })
                            }
                            onSubmitted={() =>
                                this.setState({ shownTab: "submitted" })
                            }
                            onDismissed={() =>
                                this.setState({ shownTab: "dismissed" })
                            }
                            onSettings={() =>
                                this.setState({ shownTab: "settings" })
                            }
                            selection={this.state.shownTab}
                        />
                        {this.state.shownTab === "assignment" && (
                            <>
                                <MiniSakaiAssignmentTime />
                                <MiniSakaiQuizTime />
                            </>
                        )}
                    </>
                )}
                {entryTabShown ? (
                    <>
                        <button
                            id='cs-add-memo-btn'
                            onClick={() => this.setState((state) => ({ memoBoxShown: !state.memoBoxShown }))}
                        >
                            +
                        </button>
                        <EntryTab
                            showMemoBox={this.state.memoBoxShown}
                            isSubset={this.props.subset}
                            entities={this.state.entities}
                            settings={this.state.settings}
                            onCheck={this.onCheck}
                            onMemoAdd={this.onMemoAdd}
                            onDelete={this.onMemoDelete}
                        />
                    </>
                ) : null}
                {settingsTabShown ? (
                    <SettingsTab settings={this.state.settings} onSettingsChange={this.onSettingsChange} />
                ) : null}
                
                {/**
                 * -----------------------------------------------------------------
                 * Modified by: roz
                 * Date       : 2025-05-19
                 * Changes    : 提出済みタブと非表示タブの表示コンテンツを追加
                 * Category   : UI拡張
                 * -----------------------------------------------------------------
                 */}
                {this.state.shownTab === "submitted" ? (
                    <>
                        <button
                            id='cs-add-memo-btn'
                            onClick={() => this.setState((state) => ({ submittedMemoBoxShown: !state.submittedMemoBoxShown }))}
                        >
                            +
                        </button>
                        {this.state.filteredEntities.submitted.length > 0 ? (
                            <SubmittedEntryList
                                entriesWithCourse={this.state.filteredEntities.submitted.map(entry => {
                                    const entityWithCourse = this.state.entities.find(entity =>
                                        entity.entries.some(e => e.id === entry.id)
                                    );
                                    return {
                                        entry: entry,
                                        course: entityWithCourse ? entityWithCourse.getCourse() : { id: "", name: "Unknown", link: "" }
                                    };
                                })}
                                isSubset={this.props.subset}
                                hostname={this.state.settings.appInfo.hostname}
                                showMemoBox={this.state.submittedMemoBoxShown}
                                onMemoAdd={this.onMemoAdd}
                                onToggleMemoBox={(show) => {
                                    this.setState({ submittedMemoBoxShown: show });
                                }}
                            />
                        ) : (
                            <div className="cs-tab-content-panel">
                                <div className="cs-empty-message">提出済みの課題はありません</div>
                            </div>
                        )}
                    </>
                ) : null}
                {this.state.shownTab === "dismissed" ? (
                    <>
                        {this.state.filteredEntities.dismissed.length > 0 ? (
                            <DismissedEntryList
                                entriesWithCourse={this.state.filteredEntities.dismissed.map(entry => {
                                    const entityWithCourse = this.state.entities.find(entity =>
                                        entity.entries.some(e => e.id === entry.id)
                                    );
                                    return {
                                        entry: entry,
                                        course: entityWithCourse ? entityWithCourse.getCourse() : { id: "", name: "Unknown", link: "" }
                                    };
                                })}
                                isSubset={this.props.subset}
                                hostname={this.state.settings.appInfo.hostname}
                                showMemoBox={this.state.dismissedMemoBoxShown}
                                onMemoAdd={this.onMemoAdd}
                                onEntryClick={(entry) => {
                                    this.setState({ selectedDismissedEntry: entry }, () => {
                                        this.onCheck(entry, false);
                                    });
                                }}
                                onToggleMemoBox={(show) => {
                                    this.setState({ dismissedMemoBoxShown: show });
                                }}
                            />
                        ) : (
                            <div className="cs-tab-content-panel">
                                <div className="cs-empty-message">非表示に設定した課題はありません</div>
                            </div>
                        )}
                    </>
                ) : null}
                
                {/* 日付ピッカーモーダル */}
                <DatepickerModal
                    isOpen={this.state.datepickerModalOpen}
                    onClose={this.handleDatepickerClose}
                    onSave={this.handleDatepickerSave}
                    initialDate={this.state.currentEntry ?
                        (this.state.currentEntry as any).checkTimestamp : undefined}
                    overlayFullScreen={this.state.settings.miniSakaiOption.overlayFullScreen}
                />
            </MiniSakaiContext.Provider>
        );
    }
}

function MiniSakaiLogo() {
    const src = chrome.runtime.getURL("img/logo.png");
    return <img className='cs-minisakai-logo' alt='logo' src={src} />;
}

function MiniSakaiVersion() {
    const ctx = useContext(MiniSakaiContext);
    return <p className='cs-version'>Version {ctx.settings.appInfo.version}</p>;
}

function MiniSakaiClose(props: { onClose: () => void }) {
    return (
        <button type="button" className="closebtn q" onClick={props.onClose}>
            <img src={chrome.runtime.getURL("img/closeBtn.svg")} alt="close" />
        </button>
    );
}

function MiniSakaiTabs(props: {
    onAssignment: () => void;
    onSubmitted: () => void;
    onDismissed: () => void;
    onSettings: () => void;
    selection: "assignment" | "settings" | "submitted" | "dismissed";
}) {
    const assignmentTab = useTranslation("tab_assignments");
    const settingsTab = useTranslation("tab_settings");
    const submittedTab = useTranslation("tab_submitted");
    const dismissedTab = useTranslation("tab_dismissed");

    const tabs: { key: string; label: string; onClick: () => void }[] = [
        { key: "assignment", label: assignmentTab, onClick: props.onAssignment },
        { key: "submitted", label: submittedTab, onClick: props.onSubmitted },
        { key: "dismissed", label: dismissedTab, onClick: props.onDismissed },
        { key: "settings", label: settingsTab, onClick: props.onSettings },
    ];

    return (
        <div className="cs-tab-bar">
            {tabs.map(tab => (
                <label
                    key={tab.key}
                    className={props.selection === tab.key ? "cs-tab-active" : ""}
                    onClick={tab.onClick}
                >
                    {tab.label}
                </label>
            ))}
        </div>
    );
}

function MiniSakaiTimeBox(props: { clazz: string; title: string; time: string }) {
    return (
        <div className={props.clazz}>
            <p className='cs-assignment-time-text'>{props.title}</p>
            <p className='cs-assignment-time-text'>{props.time}</p>
        </div>
    );
}

function MiniSakaiAssignmentTime() {
    const ctx = useContext(MiniSakaiContext);
    const title = useTranslation("assignment_acquisition_date");
    const time = formatTimestamp(ctx.settings.fetchTime.assignment);
    return <MiniSakaiTimeBox clazz='cs-assignment-time' title={title} time={time} />;
}

function MiniSakaiQuizTime() {
    const ctx = useContext(MiniSakaiContext);
    const title = useTranslation("testquiz_acquisition_date");
    const time = formatTimestamp(ctx.settings.fetchTime.quiz);
    return <MiniSakaiTimeBox clazz='cs-quiz-time' title={title} time={time} />;
}
