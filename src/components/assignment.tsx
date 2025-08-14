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
    onCheck: (checked: boolean, requestDate?: boolean, permanent?: boolean) => void;
}) {
    const dueTime = props.assignment.isDuePassed(CurrentTime) ? props.assignment.closeTime : props.assignment.dueTime;
    const dueDateString = createDateString(dueTime);
    const remainTimeString = getRemainTimeString(dueTime);

    const lateBadge = useTranslation("late");

    const labelId = useId();

    return (
        <div className="cs-entry-row">
            {!props.isSubset ? (
                <div className="cs-entry-actions">
                    <div
                        className="cs-minus-button"
                        onClick={() => {
                            props.onCheck(true, true);
                        }}
                    ></div>
                    <div
                        className="cs-permanent-button"
                        /**
                         * -----------------------------------------------------------------
                         * Modified by: roz
                         * Date       : 2025-08-14
                         * Changes    : 非表示ボタンのtitle/ariaをi18n化
                         * Category   : i18n
                         * -----------------------------------------------------------------
                         */
                        title={useTranslation('action_hide_permanently_title')}
                        aria-label={useTranslation('action_hide_permanently_aria')}
                        onClick={() => {
                            props.onCheck(true, false, true);
                        }}
                    ></div>
                </div>
            ) : null}

            <div className="cs-entry-content">
                {!props.isSubset ? (
                    <span className="cs-assignment-date">{dueDateString}</span>
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
                        {useTranslation('resubmit_unlimited')}
                    </span>
                )}
                {props.assignment.allowResubmitNumber === "0" && (
                    <span className="cs-badge cs-badge-resubmit-disabled">
                        {useTranslation('resubmit_not_allowed')}
                    </span>
                )}
                {props.assignment.allowResubmitNumber && 
                 props.assignment.allowResubmitNumber !== "-1" && 
                 props.assignment.allowResubmitNumber !== "0" &&
                 !isNaN(parseInt(props.assignment.allowResubmitNumber)) &&
                 parseInt(props.assignment.allowResubmitNumber) > 0 && (
                    <span className="cs-badge cs-badge-resubmit">
                        {/** i18n: 回数付き */}
                        {`${useTranslation('resubmit_count_prefix')} ${props.assignment.allowResubmitNumber}${useTranslation('resubmit_count_suffix')}`}
                    </span>
                )}
                {/* チェックタイムスタンプがある場合に表示 */}
                {props.assignment.checkTimestamp && (
                    <span className="cs-badge cs-badge-timestamp">
                        {/** i18n: 完了日時 */}
                        {`${useTranslation('completed_label')} ${props.assignment.checkTimestamp}`}
                    </span>
                )}
                </div>
            </div>
        </div>
    );
}
