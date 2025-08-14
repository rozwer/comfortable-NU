import React, { useId } from "react";
import { QuizEntry } from "../features/entity/quiz/types";
import { createDateString, getRemainTimeString } from "../utils";
import { useTranslation } from "./helper";

export default function QuizEntryView(props: {
    quiz: QuizEntry;
    isSubset: boolean;
    /**
     * -----------------------------------------------------------------
     * Modified by: roz
     * Date       : 2025-05-28
     * Changes    : onCheck関数にrequestDate?: booleanパラメータを追加
     * Category   : データ処理
     * -----------------------------------------------------------------
     */
    onCheck: (checked: boolean, requestDate?: boolean, permanent?: boolean) => void;
}) {
    const dueDateString = createDateString(props.quiz.dueTime);
    const remainTimeString = getRemainTimeString(props.quiz.dueTime);

    const quizBadge = useTranslation("quiz");

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
                    <span className="cs-badge cs-badge-quiz">{quizBadge}</span>
                    {props.quiz.title}
                    {props.quiz.checkTimestamp && (
                        <span className="cs-badge cs-badge-timestamp">{`${useTranslation('completed_label')} ${props.quiz.checkTimestamp}`}</span>
                    )}
                </p>
            </div>
        </div>
    );
}
