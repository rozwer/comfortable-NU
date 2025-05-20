/**
 * -----------------------------------------------------------------
 * Created by: GitHub Copilot
 * Date       : 2025-05-20
 * Changes    : 非表示課題のエントリ表示用コンポーネント
 * Category   : UI追加
 * -----------------------------------------------------------------
 */
import { AssignmentEntry } from "../features/entity/assignment/types";
import React, { useId, useEffect } from "react";
import { createDateString, getRemainTimeString } from "../utils";
import { CurrentTime } from "../constant";
import { useTranslation } from "./helper";
import { EntryUnion } from "./entryTab";

// スタイル修正関数をコンポーネントファイルごとに定義
function fixDismissedListStyles() {
    setTimeout(() => {
        try {
            // コース名（白色テキスト）のスタイル修正
            document.querySelectorAll('.cs-course-dismissed').forEach((elem) => {
                (elem as HTMLElement).style.color = "#f7f7f7";
                (elem as HTMLElement).style.opacity = "1";
                (elem as HTMLElement).style.background = "#888888";  // グレー系の色を使用
            });

            // 課題タイトルと日付のスタイル修正
            document.querySelectorAll('.cs-minisakai-list-dismissed .cs-assignment-title, .cs-minisakai-list-dismissed p, .cs-minisakai-list-dismissed span').forEach((elem) => {
                (elem as HTMLElement).style.color = "#464646";
                (elem as HTMLElement).style.opacity = "1";
            });
        } catch (e) {
            console.error("スタイル修正中にエラーが発生しました", e);
        }
    }, 100);
}

export default function DismissedEntryView(props: {
    entry: EntryUnion;
    isSubset: boolean;
    onToggleMemoBox?: (entry: EntryUnion) => void;
}) {
    // コンポーネントがマウントされた際にスタイル修正を実行
    useEffect(() => {
        fixDismissedListStyles();
    }, []);
    
    const entry = props.entry;
    const dueTime = entry instanceof AssignmentEntry && entry.isDuePassed(CurrentTime) 
        ? entry.closeTime 
        : entry.dueTime;
    
    const dueDateString = createDateString(dueTime);
    const remainTimeString = getRemainTimeString(dueTime);

    const lateBadge = useTranslation("late");
    const dummyId = useId();
    
    const isAssignment = entry instanceof AssignmentEntry;

    return (
        <>
            {!props.isSubset ? (
                <>
                    <div 
                        className="cs-dummy-btn cs-dismissed-clear-btn" 
                        id={dummyId} 
                        onClick={() => props.onToggleMemoBox && props.onToggleMemoBox(props.entry)}
                        style={{ opacity: 1 }}
                    >×</div>
                    <p className="cs-assignment-date" style={{ color: "#464646", opacity: 1 }}>{dueDateString}</p>
                </>
            ) : (
                <span className="cs-assignment-date cs-assignmate-date-padding" style={{ color: "#464646", opacity: 1 }}>{dueDateString}</span>
            )}
            <span className="cs-assignment-time-remain" style={{ color: "#464646", opacity: 1 }}>{remainTimeString}</span>

            <p className="cs-assignment-title" style={{ color: "#464646", opacity: 1 }}>
                {isAssignment && (entry as AssignmentEntry).isDuePassed(CurrentTime) && (
                    <span className="cs-badge cs-badge-late" style={{ opacity: 1 }}>{lateBadge}</span>
                )}
                <span style={{ color: "#464646", opacity: 1 }}>{entry.title}</span>
                <span className="cs-badge cs-badge-dismissed" style={{ opacity: 1 }}>
                    非表示
                </span>
            </p>
        </>
    );
}
