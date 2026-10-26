/**
 * What the Playables zip is allowed to ship.
 * Pages and the Play web build pass `false` and keep the other path.
 */
export interface ArtifactFlags {
  forceTouchHud: boolean;
  mouseOnTouchActions: boolean;
  landscapeLock: boolean;
  fullscreenOnGesture: boolean;
  privacyLink: boolean;
  shareButton: boolean;
  mockRemoveAds: boolean;
  mockBerryIap: boolean;
  mockInterstitial: boolean;
  playablesSdk: boolean;
  cloudSave: boolean;
}

export function artifactFlags(playables: boolean): ArtifactFlags {
  return {
    forceTouchHud: playables,
    mouseOnTouchActions: playables,
    landscapeLock: !playables,
    fullscreenOnGesture: !playables,
    privacyLink: !playables,
    shareButton: !playables,
    mockRemoveAds: !playables,
    mockBerryIap: !playables,
    mockInterstitial: !playables,
    playablesSdk: playables,
    cloudSave: playables,
  };
}
