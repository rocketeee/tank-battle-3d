# YouTube Playables gap

This is a certification checklist for a future **YouTube Playables** build (游戏大本营 / instant play inside YouTube). It is not a Shorts plan and not a Play Console plan.

The Pages site `https://rocketeee.github.io/tank-battle-3d/` stays as a reference web build. Do not upload that zip as a Playable. Do not merge this branch to `main` for this work.

Sources checked 2026-10-26:

- [Stability and performance](https://developers.google.com/youtube/gaming/playables/certification/requirements_stability)
- [Design](https://developers.google.com/youtube/gaming/playables/certification/requirements_design)
- [Integration](https://developers.google.com/youtube/gaming/playables/certification/requirements_integration)
- [Privacy / external calls](https://developers.google.com/youtube/gaming/playables/certification/requirements_privacydata)
- [Monetization](https://developers.google.com/youtube/gaming/playables/certification/requirements_monetization)

Official size rule: initial download until `gameReady` **must** be under **30 MiB** (should be under 15 MiB). Each file **must** be under 30 MiB (should be under 512 KiB). A full spike was not started.

## Measured production build

`npm run build` output in `dist/` (Vite `base: './'`). Privacy HTML is not in this folder; Pages copies it in later.

| Piece | Stored | gzip -9 |
| --- | ---: | ---: |
| `index.html` | 837 B | 506 B |
| `assets/index-19Vt8jCN.js` (initial script) | 578,956 B (565 KiB) | 153,452 B |
| `assets/index-59s9qAGE.css` | 14,932 B | 4,042 B |
| **Initial load** (those three; they are what `index.html` requests) | **594,725 B (0.57 MiB)** | **158,000 B (0.15 MiB)** |
| Whole `dist/` (5 files, includes two lazy chunks) | 595,420 B (0.57 MiB) | 158,483 B (0.15 MiB) |

30 MiB and 15 MiB are not the problem. The main script is over the **should** line of 512 KiB per file. Transfer size on Pages is the gzip column only if the host compresses; Playables measures bytes downloaded until `gameReady`.

## Checklist

| Rule | This tree | Gap |
| --- | --- | --- |
| Touch for every interaction, and mouse too | Desktop web hides sticks and uses WASD, mouse aim, left click, Space, Esc. Phone browsers and the Capacitor app keep dual sticks plus the bottom-right buttons. | A Playables build must not use the desktop-only path. Force the touch HUD and keep mouse working on the same buttons. The APK stick code is not what YouTube ingests. |
| All aspect ratios, including portrait. No orientation lock. Fill or letterbox. Keep state on resize. | Portrait shows a full-screen “请将手机横过来玩 / LANDSCAPE ONLY” guard (`src/main.ts`, `src/styles.css`). First tap also calls `requestFullscreen` and `screen.orientation.lock('landscape')`. | Fail for Playables. Remove the guard, the lock, and fullscreen from that artifact. |
| `firstFrameReady` then `gameReady` only when the player can interact. SDK script before game code. | No Playables SDK. Studio intro covers the menu for about 2.8s. | Not integrated. Call `firstFrameReady` when the first frame or splash is visible, and `gameReady` only after the intro is gone and the menu accepts input. |
| Audio follows YouTube mute. Pause and resume from the host. | Local `AudioEngine` only. No `isAudioEnabled`, `onAudioEnabledChange`, `onPause`, or `onResume`. | Required before certification. There is no in-game master mute button today, which matches the “don’t add your own mute” rule. |
| No clickable external links. No extra user agreement. No QR. No in-game share or quit. | No terms popup blocks play. Menu still has a privacy link to `https://rocketeee.github.io/tank-battle-3d/privacy.html` (`target="_blank"`). Settle has “分享战绩”. | Strip the privacy link and the share button from the Playables artifact. Leave them on the Pages / Play builds. |
| No off-platform ads or purchases. YouTube ads only, if any. | Mock “去除广告”, berry purchase, rewarded revive, reroll, and interstitial panel are in this same web build. No live AdMob SDK. | Do not ship those buttons or the mock ad panel in the Playables zip. A later Playables build may call `ytgame.ads` only. Keep AdMob, Billing, and remove-ads on a separate Play/web artifact. |
| Relative paths only. Filenames limited to letters, digits, `_`, `-`, `.` | Built `index.html` uses `./assets/...`. Hashed names match the character rule. | Paths are fine. The absolute privacy URL is an outbound link, not a bundle path. |
| Initial bundle under 30 MiB. Each file under 30 MiB. | 0.57 MiB stored, about 0.15 MiB gzipped. Largest file 0.55 MiB. | Must-pass on size. Should-pass on 15 MiB. The JS file misses the 512 KiB should-line. |
| Save data under 3 MiB, via the SDK | Profile is `localStorage` (`tb.meta.v1`), a few hundred bytes. | Size is fine. Playables should use `ytgame.game.saveData` / `loadData`. `localStorage` may not stick inside YouTube. |
| Esc must not be `preventDefault`’d | Pause uses Esc and does not cancel the event. Space does call `preventDefault`. | Likely ok. Confirm in the SDK test suite. |

## Top 5 gaps

Size is not one of them. Initial load is 0.57 MiB stored.

1. **Touch is not guaranteed.** Desktop web hides the sticks. A Playables build must show touch controls and still accept mouse on the same actions.
2. **Landscape lock.** The portrait guard, `requestFullscreen`, and `screen.orientation.lock('landscape')` fail the “every aspect ratio, no orientation lock” rule.
3. **No Playables SDK.** `firstFrameReady` and `gameReady` are not called. Host mute and pause/resume are missing.
4. **Outbound links.** The menu privacy URL opens GitHub Pages in a new tab, and settle offers “分享战绩”. Playables disallow both.
5. **Same artifact as ads.** Mock remove-ads, berry purchase, and the interstitial panel ship in this web build. A Playables zip must omit them. AdMob and Billing stay on the Play/web artifact only.

Do the spike later as its own pass (`playables-spike`). This note does not start it.
