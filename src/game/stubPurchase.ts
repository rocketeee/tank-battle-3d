import { createMonetization } from './monetization';
import { saveMeta, stubRemoveAds, stubUnlockSkin, type MetaSave } from './meta';
import { PRODUCT_REMOVE_ADS, PRODUCT_SKIN_BERRY } from './store';

export interface StubUi {
  toast: (text: string) => void;
  paint: () => void;
  refreshMenu: () => void;
}

/** Pages / Play only. The playables bundle never imports this file. */
export async function runStubPurchase(kind: 'ads' | 'skin', meta: MetaSave, ui: StubUi): Promise<void> {
  const billing = createMonetization().billing;
  if (kind === 'ads') {
    if (meta.removeAds) {
      ui.toast('插屏已经关掉了');
      return;
    }
    const result = await billing.purchase(PRODUCT_REMOVE_ADS);
    if (result !== 'purchased') {
      ui.toast('支付已取消');
      return;
    }
    stubRemoveAds(meta);
    saveMeta(meta);
    ui.refreshMenu();
    ui.toast('模拟支付完成：插屏已关闭，火力不变');
    return;
  }
  const result = await billing.purchase(PRODUCT_SKIN_BERRY);
  if (result !== 'purchased') {
    ui.toast('支付已取消');
    return;
  }
  stubUnlockSkin(meta, 'berry');
  saveMeta(meta);
  ui.paint();
  ui.refreshMenu();
  ui.toast('占位：草莓涂装已装备，火力不变');
}
