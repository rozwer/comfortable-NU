import React, { useId } from "react";
import { MemoEntry } from "../features/entity/memo/types";
import { createDateString, getRemainTimeString } from "../utils";
import { useTranslation } from "./helper";

export default function MemoEntryView(props: {
    memo: MemoEntry;
    isSubset: boolean;
    onCheck: (checked: boolean, requestDate?: boolean) => void;
    onDelete: () => void;
}) {
    const dueDateString = createDateString(props.memo.dueTime);
    const remainTimeString = getRemainTimeString(props.memo.dueTime);

    const memoBadge = useTranslation("memo");

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
                <span className="cs-badge cs-badge-memo">{memoBadge}</span>
                <a onClick={() => props.onDelete()}>
                    <img src={chrome.runtime.getURL("img/closeBtn.svg")} alt="delete memo" className="cs-del-memo-btn" />
                </a>
                {props.memo.title}
                {props.memo.checkTimestamp && (
                    <span className="cs-badge cs-badge-timestamp">
                        完了: {props.memo.checkTimestamp}
                    </span>
                )}
            </p>
        </>
    );
}
