import { MODE } from "../../constant";

import messages from "../../../_locales/en/messages.json";

export function i18nMessage(messageName: string, substitutions?: string | string[]): string {
    const isMissing = (v: any) => v === undefined || v === null || v === "";
    // 事前にメッセージカタログ(en)にキーが存在するか確認し、なければ警告
    // テスト環境でも確実に警告が出るように、ランタイム解決前に実施
    // 厳密な所有チェック（defaultも考慮）
    // @ts-ignore
    const msgObj: any = messages as any;
    const directHas = Object.prototype.hasOwnProperty.call(msgObj, messageName) && !!msgObj[messageName]?.message;
    const defaultHas = msgObj?.default && Object.prototype.hasOwnProperty.call(msgObj.default, messageName) && !!msgObj.default[messageName]?.message;
    const inCatalog = directHas || defaultHas;
    if (!inCatalog) {
        console.warn(`[i18n] Missing key (catalog): ${messageName}`);
    }

    // Development: resolve from local en JSON and warn on missing
    if (MODE === "development") {
        // @ts-ignore
        const entry = (messages as any)[messageName];
        if (!entry || !entry.message) {
            console.warn(`[i18n] Missing key in development: ${messageName}`);
            return messageName; // fall back to key for visibility
        }
        const p: string = entry.message as string;
        const regex = /\$.+?\$/gm;
        let i = 0;
        return p.replace(regex, () => {
            i += 1;
            const arr = Array.isArray(substitutions) ? substitutions : substitutions ? [substitutions] : [];
            return arr[i - 1] ?? "";
        });
    }

    // Production/Test: delegate to Chrome API; warn and fall back if empty
    const resolved = chrome?.i18n?.getMessage ? chrome.i18n.getMessage(messageName, substitutions) : "";
    if (isMissing(resolved)) {
        console.warn(`[i18n] Missing key at runtime: ${messageName}`);
        return messageName;
    }
    return resolved;
}
