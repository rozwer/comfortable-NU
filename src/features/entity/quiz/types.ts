import { Course } from "../../course/types";
import { EntityProtocol, EntryProtocol } from "../type";
import { saveQuizEntry } from "./saveQuiz";

/**
 * -----------------------------------------------------------------
 * Modified by: roz
 * Date       : 2025-05-28
 * Changes    : クイズエントリークラスにチェックタイムスタンプ追加とメソッドシグネチャ統一
 * Category   : クラス拡張
 * -----------------------------------------------------------------
 */
export class QuizEntry implements EntryProtocol {
    constructor(public id: string, public title: string, public dueTime: number, public hasFinished: boolean, public checkTimestamp?: string) {}

    getID(): string {
        return this.id;
    }

    getDueDate(showLate?: boolean): number {
        return this.dueTime;
    }

    getCloseDate(): number {
        return this.dueTime;
    }

    getTimestamp(currentTime?: number, showLateAcceptedEntry?: boolean): number {
        return this.getDueDateTimestamp;
    }

    get getDueDateTimestamp(): number {
        return this.dueTime;
    }

    render(): [React.Component<{}, {}, any>, number][] {
        throw "aaa";
    }

    save(hostname: string): Promise<void> {
        return saveQuizEntry(hostname, this);
    }
}

export class Quiz implements EntityProtocol {
    constructor(public course: Course, public entries: Array<QuizEntry>, public isRead: boolean) {}

    getEntries(): QuizEntry[] {
        return this.entries;
    }

    getCourse(): Course {
        return this.course;
    }

    render(): [React.Component<{}, {}, any>, number][] {
        return this.entries.map((e) => e.render()).reduce((acc, val) => acc.concat(val), []);
    }

    getEntriesMap(): Map<string, QuizEntry> {
        return this.entries.reduce((map, entry) => {
            return map.set(entry.id, entry);
        }, new Map<string, QuizEntry>());
    }
}
