/**
 * Seams for later AdMob, UMP, and Play Billing.
 * This build does not import those SDKs. Empty VITE_* ids in `.env` keep the mock.
 * Filling an id does not turn on a live network — there is no adapter yet.
 * Rules that must survive the swap:
 * - rewarded revive at most once per run
 * - rewarded refresh at most once per run
 * - interstitial at most once per two successful settles, never at boot or mid-fire
 * - remove-ads and skins never change damage
 */

import { BILLING_PRODUCTS, LIVE_ADS_SDK, type BillingProductId } from './store';

export type RewardedPlacement = 'revive' | 'refresh';
export type RewardResult = 'earned' | 'dismissed' | 'unavailable';
export type PurchaseResult = 'purchased' | 'cancelled' | 'unavailable';

export interface ConsentPort {
  /** TODO(ump): request Google UMP before any ad load. */
  canRequestAds(): Promise<boolean>;
}

export interface AdsPort {
  /** TODO(admob): show a rewarded unit. Caller already enforced the once-per-run rule. */
  presentRewarded(placement: RewardedPlacement): Promise<RewardResult>;
  /** TODO(admob): show an interstitial. Caller already applied shouldShowInterstitial. */
  presentInterstitial(): Promise<void>;
}

export interface BillingPort {
  /** TODO(play-billing): query and launch a cosmetic or remove-ads SKU. No power products. */
  purchase(productId: BillingProductId): Promise<PurchaseResult>;
}

export interface Monetization {
  /** True only when a real SDK adapter is constructed. Always false in this build. */
  readonly usesLiveSdk: boolean;
  consent: ConsentPort;
  ads: AdsPort;
  billing: BillingPort;
}

function readEnv(name: keyof ImportMetaEnv): string {
  const env = import.meta.env;
  if (!env) return '';
  const value = env[name];
  return typeof value === 'string' ? value.trim() : '';
}

/** Non-empty when a developer has pasted placeholders. Still not a live SDK. */
export function adMobPlaceholdersFilled(): boolean {
  return Boolean(readEnv('VITE_ADMOB_APP_ID'));
}

const mock: Monetization = {
  usesLiveSdk: LIVE_ADS_SDK,
  consent: {
    async canRequestAds() {
      return false;
    },
  },
  ads: {
    async presentRewarded() {
      return 'earned';
    },
    async presentInterstitial() {
      /* The on-screen mock panel is the stand-in. */
    },
  },
  billing: {
    async purchase(productId) {
      if (!BILLING_PRODUCTS.includes(productId)) return 'unavailable';
      return 'purchased';
    },
  },
};

export function createMonetization(): Monetization {
  // TODO(admob-ump-billing): when adMobPlaceholdersFilled(), return adapters that
  // call UMP, AdMob, and Play Billing. Until those exist, ignore the env ids
  // and keep the mock so a half-filled .env cannot hit the network.
  void adMobPlaceholdersFilled();
  return mock;
}
