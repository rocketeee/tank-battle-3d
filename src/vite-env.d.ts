interface ImportMetaEnv {
  readonly DEV: boolean;
  readonly VITE_ADMOB_APP_ID?: string;
  readonly VITE_ADMOB_REWARDED_REVIVE?: string;
  readonly VITE_ADMOB_REWARDED_REFRESH?: string;
  readonly VITE_ADMOB_INTERSTITIAL?: string;
  readonly VITE_BILLING_REMOVE_ADS?: string;
  readonly VITE_BILLING_SKIN_BERRY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
