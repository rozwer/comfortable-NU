/**
 * -----------------------------------------------------------------
 * Modified by: roz
 * Date       : 2025-08-14
 * Changes    : Move OAuth client ID and hosted domain hint to env vars
 * Category   : 設定・セキュリティ
 * -----------------------------------------------------------------
 */

// e.g. 1234567890-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com
export const WEB_OAUTH_CLIENT_ID = (process.env.WEB_OAUTH_CLIENT_ID || "");

/** Hosted domain hint (optional) e.g. 'thers.ac.jp' */
export const HOSTED_DOMAIN_HINT = (process.env.HOSTED_DOMAIN_HINT || "");
