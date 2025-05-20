import { AssignmentEntry } from "../features/entity/assignment/types";
import React, { useId } from "react";
import { createDateString, getRemainTimeString } from "../utils";
import { CurrentTime } from "../constant";
import { useTranslation } from "./helper";

export default function AssignmentEntryView(props: {
    assignment: AssignmentEntry;
    isSubset: boolean;
    onCheck: (checked: boolean, requestDate?: boolean) => void;
}) {
    const dueTime = props.assignment.isDuePassed(CurrentTime) ? props.assignment.closeTime : props.assignment.dueTime;
    const dueDateString = createDateString(dueTime);
    const remainTimeString = getRemainTimeString(dueTime);

    const lateBadge = useTranslation("late");

    const labelId = useId();

    return (
        <>
            {!props.isSubset ? (
                <>
                    <div 
                        className="cs-minus-button"
                        onClick={() => {
                            // マイナスボタンをクリックしたら日時入力を求める
                            props.onCheck(true, true);
                        }}
                    ></div>
                    <p className="cs-assignment-date">{dueDateString}</p>
                </>
            ) : (
                <span className="cs-assignment-date cs-assignmate-date-padding">{dueDateString}</span>
            )}
            <span className="cs-assignment-time-remain">{remainTimeString}</span>

            <p className="cs-assignment-title">
                {props.assignment.isDuePassed(CurrentTime) && (
                    <span className="cs-badge cs-badge-late">{lateBadge}</span>
                )}
                {props.assignment.title}
                {/**
                 * -----------------------------------------------------------------
                 * Modified by: roz
                 * Date       : 2025-05-20
                 * Changes    : 再提出可能回数をバッジとして表示する機能を追加
                 * Category   : UI拡張
                 * -----------------------------------------------------------------
                 */}
                {props.assignment.submitted && props.assignment.allowResubmitNumber && props.assignment.allowResubmitNumber !== "-1" && (
                    <span className="cs-badge cs-badge-resubmit">
                        再提出可能回数: {props.assignment.allowResubmitNumber}
                    </span>
                )}
                {/* チェックタイムスタンプがある場合に表示 */}
                {props.assignment.checkTimestamp && (
                    <span className="cs-badge cs-badge-timestamp">
                        完了: {props.assignment.checkTimestamp}
                    </span>
                )}
            </p>
        </>
    );
}
