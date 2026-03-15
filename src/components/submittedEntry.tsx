/**
 * 提出済み課題エントリー表示コンポーネント
 * 提出済みの課題を専用UIで表示する機能
 */
import { AssignmentEntry } from "../features/entity/assignment/types";
import React from "react";
import { createDateString, getRemainTimeString } from "../utils";
import { CurrentTime } from "../constant";
import { useTranslation } from "./helper";
import { EntryUnion } from "./entryTab";

export default function SubmittedEntryView(props: {
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
    const hasUnlimitedResubmit = isAssignment && entry.allowResubmitNumber === "-1";
    const isResubmitDisabled = isAssignment && entry.allowResubmitNumber === "0";
    const hasLimitedResubmit = isAssignment &&
                               entry.allowResubmitNumber &&
                               entry.allowResubmitNumber !== "-1" &&
                               entry.allowResubmitNumber !== "0" &&
                               !isNaN(parseInt(entry.allowResubmitNumber)) &&
                               parseInt(entry.allowResubmitNumber) > 0;

    return (
        <>
            {!props.isSubset ? (
                <>
                    <div
                        className="cs-dummy-btn"
                        onClick={() => props.onToggleMemoBox && props.onToggleMemoBox(props.entry)}
                    >+</div>
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
            </p>
            <div className="cs-assignment-badges">
                {hasUnlimitedResubmit && (
                    <span className="cs-badge cs-badge-resubmit">
                        再提出可能: 無制限
                    </span>
                )}
                {isResubmitDisabled && (
                    <span className="cs-badge cs-badge-resubmit-disabled">
                        再提出不可
                    </span>
                )}
                {hasLimitedResubmit && (
                    <span className="cs-badge cs-badge-resubmit">
                        再提出可能: {(entry as AssignmentEntry).allowResubmitNumber}回
                    </span>
                )}
            </div>
        </>
    );
}
