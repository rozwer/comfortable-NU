/**
 * 非表示課題リスト表示コンポーネント
 * 非表示に設定された課題の一覧表示と管理機能
 */
/**
 * -----------------------------------------------------------------
 * Created by: roz
 * Date       : 2025-05-20
 * Changes    : 非表示課題のリスト表示用コンポーネント
 * Category   : UI追加
 * -----------------------------------------------------------------
 */
import React, { useMemo, useState } from "react";
import { Course } from "../features/course/types";
import { AssignmentEntry } from "../features/entity/assignment/types";
import { EntryUnion, MemoAddInfo, DueType } from "./entryTab";
import { CurrentTime, MaxTimestamp } from "../constant";
import DismissedEntryView from "./dismissedEntry";
import { useTranslation } from "./helper";
import { getSakaiCourses } from "../features/course/getCourse";
import { getDaysUntil } from "../utils";

/**
 * -----------------------------------------------------------------
 * Added by: roz
 * Date       : 2025-05-20
 * Changes    : 非表示タブでのメモ追加機能
 * Category   : 機能拡張
 * -----------------------------------------------------------------
 */
// EntryTab.tsxからコピーしたAddMemoBoxコンポーネント
function DismissedAddMemoBox(props: { 
    shown: boolean; 
    courses: Course[]; 
    onMemoAdd: (memo: MemoAddInfo) => void;
    onClose?: () => void;
    initialContent?: string;
    initialCourseId?: string;
    initialDueTime?: number;
}) {
    const defaultDueDate = (): string => {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        return d.toISOString().substr(0, 16);
    };

    // 既存の締め切り時間があれば使用する
    const formatDueDate = (timestamp?: number): string => {
        if (!timestamp) return defaultDueDate();
        const date = new Date(timestamp * 1000); // UnixタイムスタンプをJSの日付に変換
        
        // 日本時間（JST）でdatetime-local形式に変換
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    const courseName = useTranslation("todo_box_course_name");
    const memoLabel = useTranslation("todo_box_memo");
    const dueDate = useTranslation("todo_box_due_date");
    const addBtnLabel = useTranslation("todo_box_add");

    const [selectedCourseID, setSelectedCourseID] = useState(props.initialCourseId || props.courses[0]?.id || "");
    const [todoContent, setTodoContent] = useState(props.initialContent || "");
    const [todoDue, setTodoDue] = useState(formatDueDate(props.initialDueTime));

    const options = useMemo(() => {
        return props.courses.map((course) => {
            return (
                <option value={course.id} key={`memo-option-${course.id}`}>
                    {course.name}
                </option>
            );
        });
    }, [props.courses]);

    if (!props.shown) {
        return <div></div>;
    }

    return (
        <div className='cs-memo-box addMemoBox'>
            <div className='cs-memo-item'>
                <p>{courseName}</p>
                <label>
                    <select
                        className='todoLecName'
                        value={selectedCourseID}
                        onChange={(ev) => setSelectedCourseID(ev.target.value)}
                    >
                        {options}
                    </select>
                </label>
            </div>
            <div className='cs-memo-item'>
                <p>{memoLabel}</p>
                <label>
                    <input
                        type='text'
                        className='todoContent'
                        value={todoContent}
                        onChange={(ev) => setTodoContent(ev.target.value)}
                    />
                </label>
            </div>
            <div className='cs-memo-item'>
                <p>{dueDate}</p>
                <label>
                    <input
                        type='datetime-local'
                        className='todoDue'
                        value={todoDue}
                        onChange={(ev) => setTodoDue(ev.target.value)}
                    />
                </label>
            </div>
            <div className='cs-memo-item'>
                <button
                    type='submit'
                    id='todo-add-dismissed'
                    onClick={() => {
                        if (selectedCourseID === "" || todoDue === "") return;

                        let selectedCourse: Course | undefined = undefined;
                        for (const course of props.courses) {
                            if (course.id === selectedCourseID) {
                                selectedCourse = course;
                                break;
                            }
                        }
                        if (selectedCourse === undefined) return;

                        props.onMemoAdd({
                            course: selectedCourse,
                            content: todoContent,
                            due: Date.parse(todoDue) / 1000
                        });
                        
                        // メモ追加後にフォームをリセットする
                        setTodoContent("");
                        setTodoDue(formatDueDate());
                        
                        // ボックスを閉じる通知
                        if (props.onClose) {
                            props.onClose();
                        }
                    }}
                    disabled={selectedCourseID === "" || todoDue === ""}
                >
                    {addBtnLabel}
                </button>
            </div>
        </div>
    );
}

export function DismissedCourse(props: {
    courseID: string;
    coursePage: string;
    courseName: string;
    entries: EntryUnion[];
    dueType: DueType;
    isSubset: boolean;
    onToggleMemoBox?: (entry: EntryUnion) => void;
}) {
    const divClass = `cs-assignment-${props.dueType}`;
    const aClass = `cs-course-${props.dueType} cs-course-name`;

    const elements = useMemo(() => {
        const elems: JSX.Element[] = [];
        for (const entry of props.entries) {
            elems.push(
                <DismissedEntryView
                    key={entry.getID()}
                    isSubset={props.isSubset}
                    entry={entry}
                    onToggleMemoBox={props.onToggleMemoBox}
                />
            );
        }
        return elems;
    }, [props.entries, props.isSubset, props.onToggleMemoBox]);

    return (
        <div className={divClass}>
            {/* CourseのリンクやCourse名を表示 */}
            {props.isSubset ? (
                <div className={aClass}>{props.courseName}</div>
            ) : (
                <a className={aClass} href={props.coursePage}>
                    {props.courseName}
                </a>
            )}

            {/* 課題一覧を表示 */}
            {elements}
        </div>
    );
}

export function DismissedEntryList(props: {
    entriesWithCourse: {
        entry: EntryUnion;
        course: Course;
    }[];
    isSubset: boolean;
    hostname: string;
    showMemoBox?: boolean;
    onMemoAdd?: (memo: { course: Course; content: string; due: number }) => void;
    onToggleMemoBox?: (show: boolean) => void;
    onEntryClick?: (entry: EntryUnion) => void;
}) {
    const className = "cs-minisakai-list cs-minisakai-list-dismissed";
    
    // クリックされた課題情報を状態として管理
    const [selectedEntry, setSelectedEntry] = useState<EntryUnion | null>(null);
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

    // DueTypeを計算する関数
    const calculateDueType = (entries: EntryUnion[]): DueType => {
        const minDue = entries.reduce((prev, e) => Math.min(e.dueTime, prev), MaxTimestamp);
        const daysUntilCategory = getDaysUntil(CurrentTime, minDue);
        
        // DueCategoryをDueTypeに変換
        switch (daysUntilCategory) {
            case "due24h":
                return "danger";
            case "due5d":
                return "warning";
            case "due14d":
            case "dueOver14d":
                return "success";
            default:
                return "other";
        }
    };

    // エントリをコース別にグループ化
    let courseIdMap = new Map<string, EntryUnion[]>();
    const courseNameMap = new Map<string, string>();
    
    for (const ewc of props.entriesWithCourse) {
        let entries: EntryUnion[];
        const courseID = ewc.course.id;
        
        if (!courseIdMap.has(courseID)) {
            entries = [];
            courseIdMap.set(courseID, entries);
        } else {
            entries = courseIdMap.get(courseID)!;
        }
        
        entries.push(ewc.entry);
        courseNameMap.set(courseID, ewc.course.name ?? "unknown course");
    }

    // コースをソート（締め切り日が近い順）
    const sortCourseIdMap = (a: [string, EntryUnion[]], b: [string, EntryUnion[]]): number => {
        const aMin = a[1].reduce((prev, e) => Math.min(e.dueTime, prev), MaxTimestamp);
        const bMin = b[1].reduce((prev, e) => Math.min(e.dueTime, prev), MaxTimestamp);
        return aMin - bMin;
    };

    // 課題をソート（締め切り日が近い順、同じなら名前順）
    const sortEntries = (a: EntryUnion, b: EntryUnion): number => {
        if (a.dueTime === b.dueTime) {
            if (a.title > b.title) return 1;
            else return -1;
        }
        return a.dueTime - b.dueTime;
    };

    courseIdMap = new Map([...courseIdMap.entries()].sort(sortCourseIdMap));

    const courses: JSX.Element[] = [];
    for (const [courseID, entries] of courseIdMap.entries()) {
        const courseName = courseNameMap.get(courseID) ?? "<unknown>";
        const dueType = calculateDueType(entries);
        courses.push(
            <DismissedCourse
                key={courseID}
                courseID={courseID}
                courseName={courseName}
                coursePage={`https://${props.hostname}/portal/site/${courseID}`}
                isSubset={props.isSubset}
                dueType={dueType}
                entries={entries.sort(sortEntries)}
                onToggleMemoBox={(entry) => {
                    // 「×」がクリックされたので、このエントリのcheckTimestampをクリアする処理を呼び出す
                    props.onToggleMemoBox && props.onToggleMemoBox(false);
                    
                    // このエントリをmain.tsxに伝える
                    props.onEntryClick && props.onEntryClick(entry);
                }}
            />
        );
    }

    return (
        <>
            {!props.isSubset && props.showMemoBox ? (
                <DismissedAddMemoBox
                    shown={!props.isSubset && Boolean(props.showMemoBox)}
                    courses={getSakaiCourses()}
                    onMemoAdd={(memo) => props.onMemoAdd && props.onMemoAdd(memo)}
                    onClose={() => props.onToggleMemoBox && props.onToggleMemoBox(false)}
                    initialContent={selectedEntry ? `[非表示課題] ${selectedEntry.title}` : ""}
                    initialCourseId={selectedCourse?.id}
                    initialDueTime={selectedEntry ? selectedEntry.dueTime : undefined}
                />
            ) : null}
            <div className={className}>{courses}</div>
        </>
    );
}
