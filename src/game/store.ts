/**
 * Store identity. applicationId stays com.rocketeee.tankbattle3d.
 * Do not rename it for the listing; see PLAY_STORE.md.
 */

export const APPLICATION_ID = 'com.rocketeee.tankbattle3d';
export const DEVELOPER_NAME = 'Steve Zhou';
export const DEVELOPER_HANDLE = 'rocketeee';

/** Live once GitHub Pages is enabled from this repo. See PLAY_STORE.md. */
export const PRIVACY_POLICY_URL = 'https://rocketeee.github.io/tank-battle-3d/privacy.html';

/** Play Billing product ids. Cosmetics and remove-ads only. Never a damage SKU. */
export const PRODUCT_REMOVE_ADS = 'remove_ads';
export const PRODUCT_SKIN_BERRY = 'skin_berry';

/** Real AdMob / Play Billing adapters are not constructed in this build. */
export const LIVE_ADS_SDK = false;

export const BILLING_PRODUCTS = [PRODUCT_REMOVE_ADS, PRODUCT_SKIN_BERRY] as const;
export type BillingProductId = (typeof BILLING_PRODUCTS)[number];
