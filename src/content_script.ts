import { saveHostName } from "./features/storage";
import { createMiniSakai, addMiniSakaiBtn } from "./minisakai";
import { isLoggedIn, miniSakaiReady } from "./utils";
import { isTactPortal, initializeTactFeatures } from "./features/tact/index-new";

/**
 * Creates miniSakai.
 */
async function main() {
    if (isLoggedIn()) {
        addMiniSakaiBtn();
        const hostname = window.location.hostname;
        createMiniSakai(hostname);

        miniSakaiReady();
        await saveHostName(hostname);
    }
    
    // TACTポータル用の機能を追加
    if (isTactPortal()) {
        // DOMが完全にロードされてから実行
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initTactFeatures);
        } else {
            initTactFeatures();
        }
    }
}

/**
 * TACTポータル用の機能を初期化
 */
function initTactFeatures() {
    console.log('TACT Portal detected - initializing custom tabs');
    // ツールナビゲーションが読み込まれるまで待つ
    const checkToolMenu = setInterval(() => {
        const toolMenu = document.querySelector('#toolMenu ul');
        if (toolMenu) {
            clearInterval(checkToolMenu);
            // TACT機能を初期化
            initializeTactFeatures();
        }
    }, 500);
}

main();
