/**
 * 非表示課題エントリー表示コンポーネント
 * 非表示に設定された課題を専用UIで表示する機能
 */
import { AssignmentEntry } from "../features/entity/assignment/types";
import React from "react";
import { createDateString, getRemainTimeString } from "../utils";
import { CurrentTime } from "../constant";
import { useTranslation } from "./helper";
import { EntryUnion } from "./entryTab";

export default function DismissedEntryView(props: {
    entry: EntryUnion;
    isSubset: boolean;
    onToggleMemoBox?: (entry: EntryUnion) => void;
}) {
    const entry = props.entry;
    const dueTime = entry instanceof AssignmentEntry && entry.isDuePassed(CurrentTime)
        ? entry.closeTime
        : entry.dueTime;

    const dueDateString = createDateString(dueTime);
    const remainTimeString = getRemainTimeString(dueTime);

    const lateBadge = useTranslation("late");

    const isAssignment = entry instanceof AssignmentEntry;

    return (
        <>
            {!props.isSubset ? (
                <>
                    <div
                        className="cs-dummy-btn cs-dismissed-clear-btn"
                        onClick={() => props.onToggleMemoBox && props.onToggleMemoBox(props.entry)}
                    >×</div>
                    <p className="cs-assignment-date">{dueDateString}</p>
                </>
            ) : (
                <span className="cs-assignment-date cs-assignmate-date-padding">{dueDateString}</span>
            )}
            <span className="cs-assignment-time-remain">{remainTimeString}</span>

            <p className="cs-assignment-title">
                {isAssignment && (entry as AssignmentEntry).isDuePassed(CurrentTime) && (
                    <span className="cs-badge cs-badge-late">{lateBadge}</span>
                )}
                {entry.title}
                <span className="cs-badge cs-badge-dismissed">
                    非表示
                </span>
            </p>
        </>
    );
}
