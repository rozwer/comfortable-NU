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
    onCheck: (checked: boolean, requestDate?: boolean) => void;
}) {
    const dueDateString = createDateString(props.quiz.dueTime);
    const remainTimeString = getRemainTimeString(props.quiz.dueTime);

    const quizBadge = useTranslation("quiz");

    const labelId = useId();

    return (
        <>
            {!props.isSubset ? (
                <>
                    {/**
                     * -----------------------------------------------------------------
                     * Modified by: roz
                     * Date       : 2025-05-28
                     * Changes    : チェックボックスをマイナスボタンに変更し、日時入力機能を追加
                     * Category   : UI改善
                     * -----------------------------------------------------------------
                     */}
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
                <span className="cs-badge cs-badge-quiz">{quizBadge}</span>
                {props.quiz.title}
                {/**
                 * -----------------------------------------------------------------
                 * Modified by: roz
                 * Date       : 2025-05-28
                 * Changes    : クイズタイトルにタイムスタンプバッジ表示機能を追加
                 * Category   : UI表示
                 * -----------------------------------------------------------------
                 */}
                {props.quiz.checkTimestamp && (
                    <span className="cs-badge cs-badge-timestamp">{props.quiz.checkTimestamp}</span>
                )}
            </p>
        </>
    );
}
