# 萌坦大战 · Tank Battle 3D

无尽波次的 Q 版 3D 坦克射击。**Three.js + Vite + TypeScript**，触控双摇杆，**Capacitor** 打 Android 包。画面、粒子和音效都是程序生成的，没有大型二进制素材。竞技场大约是初版的 1.8 倍宽，第一波敌人仍生成在开场视野里。

没有通关结局。波次一直变难，波间三选一强化只在本局有效。死亡后可以激励复活一次（当前是模拟广告），然后结算，一键再来。永久进度只有涂装和最佳纪录，不提供伤害。

## 怎么玩

- **左半屏按住** — 浮动摇杆移动（跟镜头方向）。
- **右半屏拖动** — 转动视角，准星射击，靠近敌人时有辅助瞄准。
- **💥 开炮** 按住连射。打中头部是暴击。
- **技能** — 跳跃冲击、散射、护盾、天罚、冲刺。有冷却。
- 清完一波会暂停，**三选一**。本局可看一次模拟激励广告换一批。
- 三条命用完后可 **激励复活 1 次**。放弃或第二次倒下会结算（波次 / 击杀 / 时间），再点一次「再来一局」。
- 主页可调瞄准灵敏度：**低 / 中 / 高**。

### 电脑调试

- **WASD / 方向键** 移动
- **鼠标右半屏拖动** 或按住右键转视角，**J** 或左半屏点击开炮
- **空格** 跳跃，**1–4** 散射 / 护盾 / 天罚 / 冲刺
- **Enter** 开始或再来，复活界面 **R** 复活、**Esc** 放弃

## 开发

```bash
npm install
npm run dev          # http://localhost:5173
npm run typecheck    # tsc --noEmit
npm run check:tune   # 波次曲线、广告频控、涂装不加伤害
npm run build        # dist/
```

调试参数：

- `?wave=N` — 从第 N 波开始（5 和 10 是守卫波）。
- `?fps=1` — 左下角显示帧率和像素比。

## Android（Capacitor）

需要 JDK 17（21 也可以）和本机 Android SDK，并设置 `ANDROID_HOME`。仓库不带 SDK。游戏本体离线，清单里只保留 WebView 需要的 `INTERNET`。横屏和沉浸式在 `android/` 工程里。装了 `@capacitor/share` 且 `npx cap sync` 之后，结算分享会走系统分享面板；没装插件时网页用 Web Share，不行就下载战绩图并复制文字。

```bash
npm install
npm run build
npx cap add android    # 只有第一次
npm run cap:sync       # 把 dist/ 同步进 android
cd android && ./gradlew assembleDebug
# 发布包：cd android && ./gradlew bundleRelease
```

签名密钥不要提交。`*.jks` 已在 `.gitignore`。

## 上架还没做（不要在这一版接真广告）

这些留到下一波，需要账号和合规材料，而不是再写玩法：

- 公开隐私政策 URL（即使声明不收集数据，Play 也要链接）
- 数据安全表、内容分级、目标受众
- 广告同意（UMP / GDPR）和真正的激励、插屏 SDK
- 512 图标、1024×500 横幅、手机截图、宣传视频
- 应用签名交给 Play App Signing，上传密钥只放本机

当前「去除广告」「草莓涂装」「激励复活」「换一批」「插屏」都是本地模拟：插屏最多每两次结算出现一次，启动和开火时不会出现，并且不会给伤害。
