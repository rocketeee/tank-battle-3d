# YouTube Playables build

This is a separate zip from the GitHub Pages site and from the Play web build. Do not upload `dist/`. Do not put AdMob, Play Billing, or live keys in this zip. Do not merge this branch to `main` for this work.

`npm run build` still writes the Pages / Play bundle to `dist/`. That build keeps the privacy link, share button, landscape guard, and mock ads.

## Build the zip

```bash
npm run build:playables
```

That typechecks, writes `dist-playables/`, checks the zip for outbound links and mock-ad copy, and writes `dist-playables.zip`. The zip root is `index.html`. Upload that zip to the Playables test suite. Do not upload the Pages site.

Local preview, as a top-level page:

```bash
npm run dev:playables
```

Serves on port 5174. `npm run preview` after a normal `npm run build` is the Pages bundle, not this one.

Opening `dist-playables/index.html` directly is the right local check. The Playables SDK script is a no-op there, and `ytgame.IN_PLAYABLES_ENV` is false, so the profile stays in `localStorage`. Inside YouTube the game is framed, that flag is true, and the profile goes through `ytgame.game.loadData` / `saveData`. A framed page that is not YouTube will sit on the loader, because `loadData` waits for the host.

## What this zip changes

- Touch sticks and the fire buttons stay on. Mouse can drag the stick, drag the aim side, and press the same buttons. WASD, left click, Space, and Esc still work.
- No portrait guard, no `requestFullscreen`, no `screen.orientation.lock`. The canvas fills the frame and resizes with it. The run state stays.
- `https://www.youtube.com/game_api/v1` loads before the game module. That is the one external URL this zip is allowed to use. `firstFrameReady` runs when the loader is on screen. `gameReady` runs only after the studio intro is gone and the menu is up.
- YouTube mute uses `isAudioEnabled` / `onAudioEnabledChange`. There is no in-game master mute button. `onPause` / `onResume` pause a live run and suspend audio.
- No privacy link, no share button, no remove-ads button, no berry purchase, no mock ad panel, no rewarded revive or reroll.

## What not to ship

- `dist/`, the Pages URL, or `docs/privacy.html` inside the zip
- AdMob, UMP, or Play Billing
- A build that hides the sticks on desktop
