/**
 * JSZipライブラリ動的ローダー
 * ファイル圧縮・解凍機能のためのJSZipライブラリを動的に読み込む
 */
/**
 * JSZipライブラリの動的読み込み機能
 */
export class JSZipLoader {
    private static instance: JSZipLoader;
    private jsZipPromise: Promise<any> | null = null;

    private constructor() {}

    public static getInstance(): JSZipLoader {
        if (!JSZipLoader.instance) {
            JSZipLoader.instance = new JSZipLoader();
        }
        return JSZipLoader.instance;
    }

    /**
     * JSZipライブラリを動的に読み込む
     */
    public async loadJSZip(): Promise<any> {
        // 既に読み込み済みの場合はそれを返す
        if ((window as any).JSZip) {
            return (window as any).JSZip;
        }

        // 読み込み中の場合は待機
        if (this.jsZipPromise) {
            return this.jsZipPromise;
        }

        // 新規読み込み
        this.jsZipPromise = this.loadScript();
        return this.jsZipPromise;
    }

    private async loadScript(): Promise<any> {
        return new Promise((resolve, reject) => {
            // JSZipがすでに利用可能な場合
            if ((window as any).JSZip) {
                resolve((window as any).JSZip);
                return;
            }

            // スクリプトタグを作成して読み込み
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
            script.async = true;
            script.onload = () => {
                if ((window as any).JSZip) {
                    resolve((window as any).JSZip);
                } else {
                    reject(new Error('JSZipの読み込みに失敗しました'));
                }
            };
            script.onerror = () => {
                reject(new Error('JSZipスクリプトの読み込みに失敗しました'));
            };

            document.head.appendChild(script);
        });
    }

    /**
     * JSZipが利用可能かチェック
     */
    public isJSZipAvailable(): boolean {
        return !!(window as any).JSZip;
    }
}
