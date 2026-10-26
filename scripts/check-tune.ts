import { canOfferRevive, canRefreshChoices, shouldShowInterstitial } from '../src/game/ads.ts';
import { ARENA_RADIUS, PLAY_BOUNDS } from '../src/game/arena.ts';
import { usesTouchControls } from '../src/game/controlMode.ts';
import {
  GEAR_SLOTS,
  SOFT_CAP,
  emptyGear,
  gearMultipliers,
  goldForRun,
  skinGoldPrice,
  slotBonus,
  tryBuySkin,
  tryUpgrade,
  upgradeCost,
} from '../src/game/gear.ts';
import { cosmeticPower, defaultMeta, SKINS, stubRemoveAds, stubUnlockSkin } from '../src/game/meta.ts';
import { formatShareText } from '../src/game/share.ts';
import { applyUpgrade, emptyMods, rollChoices, UPGRADES } from '../src/game/upgrades.ts';
import { APPLICATION_ID, BILLING_PRODUCTS, LIVE_ADS_SDK, PRIVACY_POLICY_URL } from '../src/game/store.ts';
import { specForWave } from '../src/game/waves.ts';

let failed = 0;
function check(name: string, ok: boolean) {
  if (!ok) {
    failed += 1;
    console.error('FAIL', name);
  }
}

const w1 = specForWave(1);
const w8 = specForWave(8);
check('wave 1 is a small opener', w1.aliens <= 4 && w1.ufos === 0 && !w1.boss);
check('difficulty ramps by wave 8', w8.dmgScale > w1.dmgScale * 1.5 && w8.aliens + w8.ufos > w1.aliens);
check('wave 5 is a boss, not a campaign ending', specForWave(5).boss && specForWave(6).aliens > 0);
check('wave 100 still exists', specForWave(100).wave === 100 && specForWave(100).aliens > 0);

check('arena is at least 1.5× the original 27 clamp', PLAY_BOUNDS >= 27 * 1.5 && ARENA_RADIUS >= PLAY_BOUNDS);
check('upgrade pool has at least 6', UPGRADES.length >= 6);
const offer = rollChoices(emptyMods(), 3);
const reroll = rollChoices(emptyMods(), 3, Math.random, offer.map((u) => u.id));
check('reroll replaces the cards just shown', offer.length === 3 && reroll.length === 3 && reroll.every((u) => !offer.some((o) => o.id === u.id)));
const mods = emptyMods();
const before = mods.dmg;
check('power upgrade changes run damage only', applyUpgrade(mods, 'power') && mods.dmg > before);
check('a new run does not keep that damage', emptyMods().dmg === 1);

check('cosmetics have no combat power', cosmeticPower() === 0);
check('skins are paint ids, not stat blocks', SKINS.every((s) => typeof s.body === 'number' && s.name.length > 0));
const meta = defaultMeta();
stubUnlockSkin(meta, 'berry');
check('stub skin unlock does not invent a damage field', cosmeticPower() === 0 && meta.skin === 'berry');
stubRemoveAds(meta);
check('remove-ads is a flag, not a damage stat', meta.removeAds && cosmeticPower() === 0);
check('package id stays the store id', APPLICATION_ID === 'com.rocketeee.tankbattle3d');
check('privacy url is the pages address', PRIVACY_POLICY_URL === 'https://rocketeee.github.io/tank-battle-3d/privacy.html');
check('billing products are not damage', BILLING_PRODUCTS.every((id) => !/dmg|damage|power/i.test(id)) && BILLING_PRODUCTS.length >= 2);
check('live ad sdk is not constructed', LIVE_ADS_SDK === false);

check('revive offered once', canOfferRevive(false) && !canOfferRevive(true));
check('refresh offered once', canRefreshChoices(false) && !canRefreshChoices(true));

let since = 0;
let shown = 0;
for (let settle = 0; settle < 6; settle++) {
  since += 1;
  if (shouldShowInterstitial(since, false)) {
    shown += 1;
    since = 0;
  }
}
check('one interstitial per two settles', shown === 3);
check('remove-ads suppresses interstitial', !shouldShowInterstitial(2, true));
check('boot counter does not show an ad', !shouldShowInterstitial(0, false));

const text = formatShareText({ wave: 3, kills: 12, time: 95, name: '萌坦大战' });
check('share text has name, wave, kills', text.includes('萌坦大战') && text.includes('第 3 波') && text.includes('击杀 12'));

check('soft cap is 20', SOFT_CAP === 20);
check('four hub slots', GEAR_SLOTS.map((s) => s.id).join() === 'gun,armor,tracks,radar');
check('slot names', GEAR_SLOTS.map((s) => s.name).join() === '主炮,装甲,履带,雷达');
const freshGear = gearMultipliers(emptyGear());
check('fresh gear is identity', freshGear.dmg === 1 && freshGear.hp === 1 && freshGear.speed === 1 && freshGear.fire === 1);
const capped = gearMultipliers({ gun: 20, armor: 20, tracks: 20, radar: 20 });
check('gun soft cap is +45%', Math.abs(capped.dmg - 1.45) < 0.001);
check('armor soft cap is +50%', Math.abs(capped.hp - 1.5) < 0.001);
check('tracks soft cap is +28%', Math.abs(capped.speed - 1.28) < 0.001);
check('radar soft cap is +22%', Math.abs(capped.fire - 1.22) < 0.001);
const firstStep = slotBonus('gun', 1);
const lastStep = slotBonus('gun', 20) - slotBonus('gun', 19);
check('gun returns diminish', lastStep < firstStep && firstStep * 20 > slotBonus('gun', 20));
check('cap cost is closed', upgradeCost(20) === null && upgradeCost(0) === 10);
let gold = 100000;
let level = 0;
let buys = 0;
while (buys < 30) {
  const next = tryUpgrade(gold, level);
  if (!next.spent) break;
  gold = next.gold;
  level = next.level;
  buys += 1;
}
const refused = tryUpgrade(gold, level);
check('slot stops at 20 and keeps the gold', level === 20 && buys === 20 && !refused.spent && refused.gold === gold);
check('wave depth beats a short kill pile', goldForRun(10, 0) > goldForRun(3, 80));
check('kills still pay a little', goldForRun(4, 5) > goldForRun(4, 0));
check('wave 3 settle can buy the first slot', goldForRun(3, 0) >= (upgradeCost(0) ?? 999));
const skin = tryBuySkin(500, 'sand', false);
check('skin gold does not touch gear math', skin.bought && skin.gold === 420 && gearMultipliers(emptyGear()).dmg === 1);
check('berry is not a gold power buy', skinGoldPrice('berry') === null && !tryBuySkin(99999, 'berry', false).bought);
const profile = defaultMeta();
check('new profile has no gold gear', profile.gold === 0 && profile.gear.gun === 0 && profile.gear.armor === 0 && profile.gear.tracks === 0 && profile.gear.radar === 0);
check('desktop web is not the touch path', !usesTouchControls(false, false, false));
check('app and phone browsers keep touch', usesTouchControls(true, false, false) && usesTouchControls(false, true, true));
check('a hovered pointer stays on desktop web', !usesTouchControls(false, true, false));

if (failed) {
  console.error(`${failed} checks failed`);
  process.exit(1);
}
console.log(`tune checks ok (${UPGRADES.length} upgrades, wave 8 dmg x${w8.dmgScale.toFixed(2)})`);
