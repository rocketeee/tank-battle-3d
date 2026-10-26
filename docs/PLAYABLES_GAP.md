# YouTube Playables gap

Checklist for the Playables zip versus the Pages / Play web build. Not a Shorts plan and not a Play Console plan.

Build notes: `docs/PLAYABLES.md`. Do not upload `dist/` or the Pages site. Do not merge this branch to `main` for this work.

Sources checked 2026-10-26:

- [Stability and performance](https://developers.google.com/youtube/gaming/playables/certification/requirements_stability)
- [Design](https://developers.google.com/youtube/gaming/playables/certification/requirements_design)
- [Integration](https://developers.google.com/youtube/gaming/playables/certification/requirements_integration)
- [Privacy / external calls](https://developers.google.com/youtube/gaming/playables/certification/requirements_privacydata)
- [Monetization](https://developers.google.com/youtube/gaming/playables/certification/requirements_monetization)

Official size rule: initial download until `gameReady` **must** be under **30 MiB** (should be under 15 MiB). Each file **must** be under 30 MiB (should be under 512 KiB).

## Measured builds

Pages / Play, `npm run build` → `dist/`. Unchanged role: reference web build. Initial script is still one file over the 512 KiB should-line (`assets/index-F4v05mv_.js`, 577,621 B). It still contains the privacy URL and `requestFullscreen`.

Playables, `npm run build:playables` → `dist-playables/` (4 files, gzip -9):

| Piece | Stored | gzip -9 |
| --- | ---: | ---: |
| `index.html` (SDK script, then `./assets/...`) | 978 B | 560 B |
| `assets/index-wAMP30Xg.js` | 91,933 B | 29,113 B |
| `assets/three-ZTraLgtY.js` | 472,131 B (461 KiB) | 118,619 B |
| `assets/index-4m_c3CpS.css` | 14,958 B | 4,050 B |
| **Whole zip / initial load** (modulepreload pulls three before the menu) | **580,000 B (0.55 MiB)** | **152,342 B (0.15 MiB)** |

Under 30 MiB and under 15 MiB. The largest file is under the 512 KiB should-line. `index.html` requests only relative `./assets/` paths. The SDK URL is the required YouTube script, not a game file.

## Checklist

| Rule | Playables zip | Pages / Play `dist/` |
| --- | --- | --- |
| Touch for every interaction, and mouse too | Sticks and buttons stay visible. Mouse can drag the stick and press the same buttons. | Desktop web still hides the sticks. |
| All aspect ratios. No orientation lock. Keep state on resize. | No rotate guard, no fullscreen, no landscape lock. Canvas follows the frame. | Portrait guard and the first-tap landscape lock stay. |
| SDK before game code. `firstFrameReady`, then `gameReady` only when the menu accepts input. | Script is the first tag in `index.html`. Loader calls `firstFrameReady`. `gameReady` waits until the intro is removed. | No SDK. |
| Host mute, pause, and resume. No in-game master mute. | `isAudioEnabled`, `onAudioEnabledChange`, `onPause`, `onResume` are wired. | Local audio only. |
| No outbound links, share, or extra terms. | Privacy link and share button are absent from the zip. | Privacy link and share stay. |
| No off-platform ads or purchases. | No remove-ads, berry purchase, mock interstitial, revive, or reroll. | Those mocks stay. |
| Relative paths. | Game files are `./assets/...`. | Same. |
| Initial bundle under 30 MiB. Each file under 30 MiB, should be under 512 KiB. | 0.55 MiB stored. Largest file 461 KiB. | Under 30 MiB. Main script is over 512 KiB. |
| Save data under 3 MiB via the SDK. | When `ytgame.IN_PLAYABLES_ENV` is set, meta and settings use `loadData` / `saveData`. A top-level local preview keeps `localStorage`. | `localStorage` only. |
| Esc must not be `preventDefault`'d. | Pause does not cancel Esc. | Same. Confirm in the SDK test suite. |

## Top 5 gaps

1. **Touch HUD.** Fixed in the Playables zip. Pages still hides sticks on desktop.
2. **Landscape lock.** Fixed in the Playables zip. A 400×900 frame resizes the canvas and does not show the rotate guard.
3. **Playables SDK.** Wired in this zip: script order, `firstFrameReady`, `gameReady`, mute, pause, resume. Not yet run through YouTube's SDK test suite.
4. **Outbound links.** Privacy URL and share are out of this zip. They remain on Pages.
5. **Separate ads artifact.** Mock remove-ads, berry IAP, and the mock ad panel are Pages-only. This zip does not call `ytgame.ads`. Adding YouTube interstitials or rewarded ads is later work.

Still open: submit `dist-playables.zip` to the Playables test suite. That pass has to confirm Esc, host mute, and `loadData` against the real YouTube parent. A framed page that is not YouTube waits on `loadData` and should not be used as the local check.
