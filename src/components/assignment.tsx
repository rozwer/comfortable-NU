/**
 * -----------------------------------------------------------------
 * Modified by: roz
 * Date       : 2025-05-28
 * Changes    : マイナスボタンUI実装と再提出情報・タイムスタンプ表示機能追加
 * Category   : UI拡張
 * -----------------------------------------------------------------
 */
// filepath: /home/rozwer/sakai/comfortable-sakai/src/components/assignment.tsx
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
                {props.assignment.dueTime < props.assignment.closeTime && props.assignment.isDuePassed(CurrentTime) && CurrentTime <= props.assignment.closeTime && (
                    <span className="cs-badge cs-badge-late">{lateBadge}</span>
                )}
                {props.assignment.title}
            </p>
            {/**
             * -----------------------------------------------------------------
             * Modified by: roz
             * Date       : 2025-05-20
             * Changes    : 再提出可能回数をバッジとして表示する機能を追加
             * Category   : UI拡張
             * -----------------------------------------------------------------
             */}
            <div className="cs-assignment-badges">
                {props.assignment.allowResubmitNumber === "-1" && (
                    <span className="cs-badge cs-badge-resubmit">
                        再提出可能: 無制限
                    </span>
                )}
                {props.assignment.allowResubmitNumber === "0" && (
                    <span className="cs-badge cs-badge-resubmit-disabled">
                        再提出不可
                    </span>
                )}
                {props.assignment.allowResubmitNumber && 
                 props.assignment.allowResubmitNumber !== "-1" && 
                 props.assignment.allowResubmitNumber !== "0" &&
                 !isNaN(parseInt(props.assignment.allowResubmitNumber)) &&
                 parseInt(props.assignment.allowResubmitNumber) > 0 && (
                    <span className="cs-badge cs-badge-resubmit">
                        再提出可能: {props.assignment.allowResubmitNumber}回
                    </span>
                )}
                {/* チェックタイムスタンプがある場合に表示 */}
                {props.assignment.checkTimestamp && (
                    <span className="cs-badge cs-badge-timestamp">
                        完了: {props.assignment.checkTimestamp}
                    </span>
                )}
            </div>
        </>
    );
}
