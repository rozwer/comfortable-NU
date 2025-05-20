import React, { useId } from "react";
import { QuizEntry } from "../features/entity/quiz/types";
import { createDateString, getRemainTimeString } from "../utils";
import { useTranslation } from "./helper";

export default function QuizEntryView(props: {
    quiz: QuizEntry;
    isSubset: boolean;
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
                {props.quiz.checkTimestamp && (
                    <span className="cs-badge cs-badge-timestamp">{props.quiz.checkTimestamp}</span>
                )}
            </p>
        </>
    );
}
