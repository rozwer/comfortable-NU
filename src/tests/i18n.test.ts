import { i18nMessage } from "../features/chrome";

describe('i18nMessage', () => {
  test('returns a known key without placeholders', () => {
    const v = i18nMessage('tab_settings');
    expect(typeof v).toBe('string');
    expect(v.length).toBeGreaterThan(0);
  });

  test('handles placeholders', () => {
    const out = i18nMessage('version_label', ['1.2.3']);
    expect(out).toContain('1.2.3');
  });

  test('warns on unknown keys or falls back to key', () => {
    const spy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const out = i18nMessage('unknown_key_for_test');
    // 設計: 未定義キーは警告を出すか、キー文字列を返す（環境によって片方のみになる場合がある）
    // デバッグ: 実際の戻り値も確認できるようログ
    // eslint-disable-next-line no-console
    console.log('i18n unknown_key_for_test ->', JSON.stringify(out));
    expect(spy.mock.calls.length >= 1 || out === 'unknown_key_for_test').toBeTruthy();
    spy.mockRestore();
  });
});
