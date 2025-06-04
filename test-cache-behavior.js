/**
 * キャッシュ動作確認用テストスクリプト
 */

// キャッシュ判定ロジックをテスト
function shouldUseCache(fetchTime, currentTime, cacheInterval) {
    console.log(`キャッシュ判定:
  - 最終取得時刻: ${fetchTime ? new Date(fetchTime * 1000).toLocaleString() : 'undefined'}
  - 現在時刻: ${new Date(currentTime * 1000).toLocaleString()}
  - キャッシュ間隔: ${cacheInterval}秒
  - 経過時間: ${fetchTime ? currentTime - fetchTime : 'N/A'}秒`);
    
    if (fetchTime === undefined) {
        console.log('結果: キャッシュなし（初回取得）');
        return false;
    }
    
    const elapsed = currentTime - fetchTime;
    const useCache = elapsed <= cacheInterval;
    
    console.log(`結果: ${useCache ? 'キャッシュ使用' : '新規取得'}`);
    return useCache;
}

// テストケース1: 初回取得（fetchTimeがundefined）
console.log('=== テストケース1: 初回取得 ===');
const currentTime = Math.floor(Date.now() / 1000);
shouldUseCache(undefined, currentTime, 120); // 2分間隔

// テストケース2: キャッシュ有効期間内
console.log('\n=== テストケース2: キャッシュ有効期間内 ===');
const recentFetchTime = currentTime - 60; // 1分前に取得
shouldUseCache(recentFetchTime, currentTime, 120); // 2分間隔

// テストケース3: キャッシュ期限切れ
console.log('\n=== テストケース3: キャッシュ期限切れ ===');
const oldFetchTime = currentTime - 180; // 3分前に取得
shouldUseCache(oldFetchTime, currentTime, 120); // 2分間隔

// 実際の設定値を確認
console.log('\n=== 実際の設定値 ===');
console.log('課題キャッシュ間隔: 120秒（2分）');
console.log('クイズキャッシュ間隔: 600秒（10分）');
