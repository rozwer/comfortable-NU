/**
 * 統一ロガー
 * 本番ビルドでは DEBUG レベルのログを除外する
 */

const enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3
}

const IS_PRODUCTION = typeof process !== 'undefined' && process.env.NODE_ENV === 'production';
const MIN_LEVEL: LogLevel = IS_PRODUCTION ? LogLevel.INFO : LogLevel.DEBUG;

function createLogger(prefix: string) {
    return {
        debug(...args: any[]) {
            if (MIN_LEVEL <= LogLevel.DEBUG) {
                console.log(`[${prefix}]`, ...args);
            }
        },
        info(...args: any[]) {
            if (MIN_LEVEL <= LogLevel.INFO) {
                console.log(`[${prefix}]`, ...args);
            }
        },
        warn(...args: any[]) {
            if (MIN_LEVEL <= LogLevel.WARN) {
                console.warn(`[${prefix}]`, ...args);
            }
        },
        error(...args: any[]) {
            console.error(`[${prefix}]`, ...args);
        }
    };
}

export { createLogger };
export type Logger = ReturnType<typeof createLogger>;
