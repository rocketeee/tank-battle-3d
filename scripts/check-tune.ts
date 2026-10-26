import { canOfferRevive, canRefreshChoices, shouldShowInterstitial } from '../src/game/ads.ts';
import { cosmeticPower, defaultMeta, SKINS, stubUnlockSkin } from '../src/game/meta.ts';
import { formatShareText } from '../src/game/share.ts';
import { applyUpgrade, emptyMods, UPGRADES } from '../src/game/upgrades.ts';
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

check('upgrade pool has at least 6', UPGRADES.length >= 6);
const mods = emptyMods();
const before = mods.dmg;
check('power upgrade changes run damage only', applyUpgrade(mods, 'power') && mods.dmg > before);
check('a new run does not keep that damage', emptyMods().dmg === 1);

check('cosmetics have no combat power', cosmeticPower() === 0);
check('skins are paint ids, not stat blocks', SKINS.every((s) => typeof s.body === 'number' && s.name.length > 0));
const meta = defaultMeta();
stubUnlockSkin(meta, 'berry');
check('stub skin unlock does not invent a damage field', cosmeticPower() === 0 && meta.skin === 'berry');

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

if (failed) {
  console.error(`${failed} checks failed`);
  process.exit(1);
}
console.log(`tune checks ok (${UPGRADES.length} upgrades, wave 8 dmg x${w8.dmgScale.toFixed(2)})`);
