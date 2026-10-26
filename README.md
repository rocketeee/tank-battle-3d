# 萌坦大战 · Tank Battle 3D

无尽波次的 Q 版 3D 坦克射击。**Three.js + Vite + TypeScript**，触控双摇杆，**Capacitor** 打 Android 包。画面、粒子和音效都是程序生成的，没有大型二进制素材。竞技场大约是初版的 1.8 倍宽，第一波敌人仍生成在开场视野里。

没有通关结局。波次一直变难，波间三选一强化只在本局有效，死亡后清空。倒下后可以激励复活一次（当前是模拟广告），然后结算金币，一键再来。金币在整备里升四项：主炮、装甲、履带、雷达，每项 20 级后按钮变成「已满级」，收益递减，满级仍然会被更高的波次打倒。涂装和「去除广告」不加伤害，也不卖战斗力礼包。

## 怎么玩

- **左半屏按住** — 浮动摇杆移动（跟镜头方向）。
- **右半屏拖动** — 转动视角，准星射击，靠近敌人时有辅助瞄准。
- **💥 开炮** 按住连射。打中头部是暴击。
- **技能** — 跳跃冲击、散射、护盾、天罚、冲刺。有冷却。
- 清完一波会暂停，**三选一**。本局可看一次模拟激励广告换一批。
- 三条命用完后可 **激励复活 1 次**。放弃或第二次倒下会结算（波次 / 击杀 / 时间 / 金币），再点一次「再来一局」，或先去整备再出发。
- 主页和结算都能进 **整备**。金币升主炮、装甲、履带、雷达。满级显示「已满级」。多出来的金币可以买沙金、星紫、奶油涂装。草莓涂装仍是支付占位。
- 主页可调瞄准灵敏度：**低 / 中 / 高**。

### 电脑网页

虚拟摇杆和右下角按钮会藏起来。第一次进入对局会提示一次键位。

- **WASD / 方向键** 移动
- **鼠标** 瞄准（炮塔跟着指针），**左键** 开炮
- **空格** 跳跃。右键不是操作
- **Esc** 暂停 / 继续。复活界面 **Esc** 仍是放弃并结算
- **Enter** 开始、再来，或在整备里出发。复活界面 **R** 复活

### 手机 / App

- 左摇杆移动，右半屏瞄准，右下角开炮和技能。和网页键鼠是两套界面。

## 开发

```bash
npm install
npm run dev          # http://localhost:5173
npm run typecheck    # tsc --noEmit
npm run check:tune   # 波次曲线、广告频控、金币软上限、涂装不加伤害
npm run build        # dist/
```

调试参数：

- `?wave=N` — 从第 N 波开始（5 和 10 是守卫波）。
- `?fps=1` — 左下角显示帧率和像素比。

## Android（Capacitor）

需要 JDK 17（21 也可以）和本机 Android SDK，并设置 `ANDROID_HOME`。仓库不带 SDK。游戏本体离线，清单里只保留 WebView 需要的 `INTERNET`。横屏和沉浸式在 `android/` 工程里。结算分享在手机上走 `@capacitor/share` 的系统面板（文字：波次、击杀、名字）。网页没有该插件时用 Web Share，附带战绩图；再不行就下载图片并复制文字。

```bash
npm install
npm run build
npx cap add android    # 只有第一次
npm run cap:sync       # 把 dist/ 同步进 android
npm run android:debug  # assembleDebug
npm run android:bundle # bundleRelease，签名见 PLAY_STORE.md
```

签名密钥不要提交。`*.jks` 和 `android/keystore.properties` 已在 `.gitignore`。

## 上架草稿

文案、数据安全表、分级说明、截图尺寸、隐私政策 URL 和本地 AAB 步骤在 [PLAY_STORE.md](PLAY_STORE.md)。

隐私政策页面是 `docs/privacy.html`。Pages 打开后的地址是 `https://rocketeee.github.io/tank-battle-3d/privacy.html`（需要在仓库 Settings → Pages 里选 GitHub Actions，见该文档）。主菜单有同一链接。

当前「去除广告」「草莓涂装」「激励复活」「换一批」「插屏」仍是本地模拟：插屏最多每两次结算出现一次，启动和开火时不会出现，并且不会给伤害。真 AdMob、UMP、Play Billing 的接口在 `src/game/monetization.ts`，这一版不带那些 SDK。
