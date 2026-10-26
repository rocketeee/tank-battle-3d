/**
 * Ad policy only. No network SDK.
 * The mock panel still runs these rules. Live AdMob / UMP hooks live in
 * monetization.ts and must not grant combat power.
 */

/** Max one interstitial per two death-settles. Boot and combat never call this. */
export function shouldShowInterstitial(settlesSinceAd: number, removeAds: boolean): boolean {
  if (removeAds) return false;
  return settlesSinceAd >= 2;
}

/** Rewarded revive is offered once per run, before the settle screen. */
export function canOfferRevive(reviveUsed: boolean): boolean {
  return !reviveUsed;
}

/** Choice refresh is a second rewarded placement, also once per run. */
export function canRefreshChoices(refreshUsed: boolean): boolean {
  return !refreshUsed;
}
