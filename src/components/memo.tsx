/**
 * -----------------------------------------------------------------
 * Modified by: roz
 * Date       : 2025-05-28
 * Changes    : チェックボックスをマイナスボタンに変更し、チェックタイムスタンプ表示機能を追加
 * Category   : UI変更
 * -----------------------------------------------------------------
 */
// filepath: /home/rozwer/sakai/comfortable-sakai/src/components/memo.tsx
import React, { useId } from "react";
import { MemoEntry } from "../features/entity/memo/types";
import { createDateString, getRemainTimeString } from "../utils";
import { useTranslation } from "./helper";

/**
 * -----------------------------------------------------------------
 * Modified by: roz
 * Date       : 2025-05-28
 * Changes    : onCheck関数のシグネチャにrequestDateオプションを追加
 * Category   : 機能拡張
 * -----------------------------------------------------------------
 */
export default function MemoEntryView(props: {
    memo: MemoEntry;
    isSubset: boolean;
    onCheck: (checked: boolean, requestDate?: boolean, permanent?: boolean) => void;
    onDelete: () => void;
}) {
    const dueDateString = createDateString(props.memo.dueTime);
    const remainTimeString = getRemainTimeString(props.memo.dueTime);

    const memoBadge = useTranslation("memo");

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
                        /** i18n: 非表示ボタンのtitle */
                        title={useTranslation('action_hide_permanently_title')}
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
                    <span className="cs-badge cs-badge-memo">{memoBadge}</span>
                    <a onClick={() => props.onDelete()}>
                        {/* i18n: メモ削除 */}
                        <img src={chrome.runtime.getURL("img/closeBtn.svg")} alt={useTranslation('alt_delete_memo')} className="cs-del-memo-btn" />
                    </a>
                    {props.memo.title}
                    {props.memo.checkTimestamp && (
                        <span className="cs-badge cs-badge-timestamp">
                            {`${useTranslation('completed_label')} ${props.memo.checkTimestamp}`}
                        </span>
                    )}
                </p>
            </div>
        </div>
    );
}
