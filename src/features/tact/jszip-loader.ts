import * as JSZip from 'jszip';

/**
 * JSZipライブラリローダー
 * ローカルにバンドルされたJSZipライブラリを提供する
 */
export class JSZipLoader {
    private static instance: JSZipLoader;

    private constructor() {}

    public static getInstance(): JSZipLoader {
        if (!JSZipLoader.instance) {
            JSZipLoader.instance = new JSZipLoader();
        }
        return JSZipLoader.instance;
    }

    /**
     * JSZipライブラリを取得する
     * ローカルにバンドルされたライブラリを返す
     */
    public async loadJSZip(): Promise<typeof JSZip> {
        return JSZip;
    }

    /**
     * JSZipが利用可能かチェック
     */
    public isJSZipAvailable(): boolean {
        return true; // ローカルライブラリなので常に利用可能
    }
}
