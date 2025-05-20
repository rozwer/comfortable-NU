import React, { useContext } from "react";
import { useTranslation } from "./helper";
import { formatTimestamp, getEntities, updateIsReadFlag } from "../utils";
import { EntityUnion, EntryTab, EntryUnion, MemoAddInfo } from "./entryTab";
import { SettingsChange, SettingsTab } from "./settings";
import { SubmittedEntryList } from "./submittedEntryList";
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
};

export class MiniSakaiRoot extends React.Component<MiniSakaiRootProps, MiniSakaiRootState> {
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
            submittedMemoBoxShown: false
        };

        this.onCheck = this.onCheck.bind(this);
        this.onMemoAdd = this.onMemoAdd.bind(this);
        this.onMemoDelete = this.onMemoDelete.bind(this);
        this.onSettingsChange = this.onSettingsChange.bind(this);
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
        document.addEventListener('submittedTabClick', () => {
            this.setState({
                shownTab: "submitted"
            });
        });
        
        // 非表示タブクリック時のイベントリスナーを登録
        document.addEventListener('dismissedTabClick', () => {
            this.setState({
                shownTab: "dismissed"
            });
        });
        
        getStoredSettings(this.props.hostname).then((s) => {
            this.setState({ settings: s }, () => {
                this.reloadEntities();
            });
        });
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
        document.removeEventListener('submittedTabClick', () => {});
        document.removeEventListener('dismissedTabClick', () => {});
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
            
            // 提出済みの課題を抽出
            const submittedEntries = allEntries
                .filter(item => (item.entry as any).submitted === true)
                .map(item => item.entry);
            
            // 非表示の課題を抽出
            // 注：現在「非表示」タグはまだ割り振っていないので、空のリストを返します
            const dismissedEntries: EntryUnion[] = []; // 一時的に空リストを設定
            
            // 将来的にはこのようなコードになる予定:
            // const dismissedEntries = allEntries
            //    .filter(item => (item.entry as any).dismissed === true)
            //    .map(item => item.entry);
            
            this.setState({
                entities: allEntities,
                filteredEntities: {
                    submitted: submittedEntries,
                    dismissed: dismissedEntries
                }
            });
            updateIsReadFlag(window.location.href, entities.assignment, this.props.hostname);
        });
    }

    private onCheck(entry: EntryUnion, checked: boolean) {
        const newEntry = _.cloneDeep(entry);
        newEntry.hasFinished = checked;
        newEntry.save(this.props.hostname).then(() => {
            this.reloadEntities();
        });
    }

    private onMemoAdd(memo: MemoAddInfo) {
        const newMemo = new MemoEntry(uuidv4(), memo.content, memo.due, false);
        saveNewMemoEntry(this.state.settings.appInfo.hostname, newMemo, memo.course).then(() => {
            // メモ追加後にメモボックスを閉じる
            this.setState({
                memoBoxShown: false,
                submittedMemoBoxShown: false
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
            });
            return;
        }

        _.set(newSettings, change.id, change.newValue);
        saveSettings(this.state.settings.appInfo.hostname, newSettings).then(() => {
            this.setState({
                settings: newSettings
            });
        });
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
                                this.setState({
                                    shownTab: "assignment"
                                })
                            }
                            onSettings={() =>
                                this.setState({
                                    shownTab: "settings"
                                })
                            }
                            selection={this.state.shownTab}
                        />
                        {this.state.shownTab === "assignment" ? (
                            <>
                                <button
                                    id='cs-add-memo-btn'
                                    onClick={() => {
                                        this.setState((state) => {
                                            return {
                                                memoBoxShown: !state.memoBoxShown
                                            };
                                        });
                                    }}
                                >
                                    +
                                </button>
                                <MiniSakaiAssignmentTime />
                                <MiniSakaiQuizTime />
                            </>
                        ) : null}
                    </>
                )}
                {entryTabShown ? (
                    <EntryTab
                        showMemoBox={this.state.memoBoxShown}
                        isSubset={this.props.subset}
                        entities={this.state.entities}
                        settings={this.state.settings}
                        onCheck={this.onCheck}
                        onMemoAdd={this.onMemoAdd}
                        onDelete={this.onMemoDelete}
                    />
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
                        <h3>提出済みの課題</h3>
                        {this.state.filteredEntities.submitted.length > 0 ? (
                            <SubmittedEntryList
                                entriesWithCourse={this.state.filteredEntities.submitted.map(entry => {
                                    // 元々のエントリに対応するコースを見つける
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
                            <div className="cs-empty-message">提出済みの課題はありません</div>
                        )}
                    </>
                ) : null}
                {this.state.shownTab === "dismissed" ? (
                    <div className="cs-tab-content">
                        <h3>非表示の課題</h3>
                        <p>「非表示」機能は現在開発中です。将来のバージョンで実装される予定です。</p>
                        <p>この機能を使用すると、特定の課題をリストから非表示にできるようになります。</p>
                    </div>
                ) : null}
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
    onSettings: () => void;
    selection: "assignment" | "settings" | "submitted" | "dismissed";
}) {
    const assignmentTab = useTranslation("tab_assignments");
    const settingsTab = useTranslation("tab_settings");
    const submittedTab = "提出済み"; // 新規追加：提出済みタブ
    const dismissedTab = "非表示"; // 新規追加：非表示タブ
    const assignmentChecked = props.selection === "assignment";
    const submittedChecked = props.selection === "submitted";
    const dismissedChecked = props.selection === "dismissed";
    const settingsChecked = props.selection === "settings";
    
    return (
        <>
            <input
                id='assignmentTab'
                type='radio'
                name='cs-tab'
                onClick={props.onAssignment}
                defaultChecked={assignmentChecked}
            />
            <label htmlFor='assignmentTab'> {assignmentTab} </label>
            
            {/**
             * -----------------------------------------------------------------
             * Modified by: roz
             * Date       : 2025-05-19
             * Changes    : 提出済みタブと非表示タブの機能を追加
             * Category   : UI拡張
             * -----------------------------------------------------------------
             */}
            {/* 提出済みタブ */}
            <input
                id='submittedTab'
                type='radio'
                name='cs-tab'
                onClick={() => {
                    // タブを切り替える際に呼び出される関数
                    const event = new CustomEvent('submittedTabClick', {
                        detail: { message: 'タブがクリックされました' }
                    });
                    document.dispatchEvent(event);
                }}
                defaultChecked={submittedChecked}
            />
            <label htmlFor='submittedTab'> {submittedTab} </label>
            
            {/* 非表示タブ */}
            <input
                id='dismissedTab'
                type='radio'
                name='cs-tab'
                onClick={() => {
                    // タブを切り替える際に呼び出される関数
                    const event = new CustomEvent('dismissedTabClick', {
                        detail: { message: 'タブがクリックされました' }
                    });
                    document.dispatchEvent(event);
                }}
                defaultChecked={dismissedChecked}
            />
            <label htmlFor='dismissedTab'> {dismissedTab} </label>
            
            <input
                id='settingsTab'
                type='radio'
                name='cs-tab'
                onClick={props.onSettings}
                defaultChecked={settingsChecked}
            />
            <label htmlFor='settingsTab'> {settingsTab} </label>
        </>
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
