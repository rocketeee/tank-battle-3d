# 萌坦大战 · Play 上架草稿

这一份是提交前的清单和文案草稿。**不要上传 AAB，不要在 Play Console 点提交，不要填真实广告或支付密钥。** 开发者已有 Google Play 开发者账号；正式提交和任何付费步骤仍要本人确认。

开发者：Steve Zhou（GitHub [rocketeee](https://github.com/rocketeee)）。没有另设公司主体。

## 身份（保持不变）

| 项 | 值 |
| --- | --- |
| 应用名 | 萌坦大战 |
| 包名 `applicationId` | `com.rocketeee.tankbattle3d` |
| 版本 | versionName `1.0` / versionCode `1` |
| 默认语言文案 | 中文，英文对照写在下面 |
| 联系邮箱 | rocketeee@gmail.com（Steve Zhou / rocketeee） |

**不要改包名。** 如果商店展示名想加英文，只改 Play 的应用标题（50 字以内），例如 `萌坦大战`。包名一旦上传过就不能换。没有“为了上架而改名”的必要。

## 隐私政策 URL

目标地址（Pages 打开之后）：

`https://rocketeee.github.io/tank-battle-3d/privacy.html`

页面源文件：`docs/privacy.html`（中英双语）。同一地址写在：

- `src/game/store.ts` 的 `PRIVACY_POLICY_URL`（主菜单「隐私政策」链接）
- `android/app/src/main/res/values/strings.xml` 的 `privacy_policy_url`
- `AndroidManifest.xml` 的 `meta-data` `privacy_policy_url`
- 本文件和 `README.md`

### 怎么让这个 URL 能打开（不合并 main）

联系邮箱已经是 `rocketeee@gmail.com`，写在 `docs/privacy.html`。不要再换回占位地址。

`.github/workflows/pages.yml` 在下面两种情况把 `docs/` 发到 GitHub Pages（源是 **GitHub Actions**，不是把 PR 合并进 `main`）：

- 推送到 `main` 或 `cursor/mobile-play-wave1-6414`
- Actions 里手动跑 `pages`（`workflow_dispatch`）

重新发布：

```bash
gh workflow run pages.yml --ref cursor/mobile-play-wave1-6414
```

仓库是公开的。部署成功后打开上面的 URL，应能看到中英政策和 `rocketeee@gmail.com`。Play Console 的隐私政策栏粘贴同一 URL。不要把本 PR 合并进 `main` 才算发布。

当前还差一次人工开关。2026-10-26 用本分支推送已经跑过 `pages`：`actions/upload-pages-artifact` 成功，`actions/deploy-pages` 失败，日志是 `Failed to create deployment (status: 404) ... Ensure GitHub Pages has been enabled`（run `40281391709`）。用 API 打开 Pages 也被拒：

`POST /repos/rocketeee/tank-battle-3d/pages` → **403** `Resource not accessible by integration`。响应头 `X-Accepted-Github-Permissions: pages=write,administration=write`。这个云端令牌没有仓库管理权限，不能替你改 Settings。

你在 GitHub 打开 **Settings → Pages → Build and deployment → Source → GitHub Actions**，保存后再跑一次上面的 `gh workflow run`。不用合并 `main`。

## 短说明（80 字以内）

中文（23 字）：

> Q版无尽坦克射击。波间三选一，涂装不含战斗力。

英文（73 字符）：

> Endless cute tank waves. Upgrades last one run. Skins don't add damage.

## 完整说明

中文：

> 萌坦大战是卡通坦克射击。没有通关结局：一波接一波，波间三选一强化只在本局有效，倒下后可以看一次激励复活（当前版本是模拟），然后结算，再点一次就重来。
>
> 左半屏移动，右半屏瞄准，按住开炮。打中头部会暴击。结算金币可在整备里升级主炮、装甲、履带、雷达，每项 20 级后显示已满级，收益递减。涂装只改颜色，不加伤害。没有战斗力礼包。网页版用键鼠，不显示虚拟摇杆。
>
> 当前安装包没有真实广告、没有真实支付、不需要登录。隐私政策说明了设备本地保存了什么，以及以后如果接入广告和“去除广告 / 涂装”时会怎样。

English:

> Tank Battle 3D is a cartoon tank shooter with no ending. Waves keep coming. Upgrades picked between waves last for that run only. After you fall you may take one rewarded revive (still a mock in this build), then settle and retry in one tap.
>
> Move on the left half of the screen, aim on the right, and hold fire. Headshots crit. Gold from a run upgrades the main gun, armor, tracks, and radar. Each slot stops at level 20. Paints change color only and do not add damage. There is no power-pack purchase. The desktop page uses a keyboard and mouse and hides the virtual sticks.
>
> This build has no live ads, no live billing, and no login. The privacy policy describes what stays on the device, and what ads or cosmetic purchases would mean if they are added later.

## 内容分级草稿（还没填 IARC）

适合全年龄的卡通坦克。不要按血腥或写实战争来填。

| 问卷方向 | 建议回答 |
| --- | --- |
| 暴力 | 轻度卡通幻想暴力。坦克变成粉色星星爆炸。没有血、没有残肢、没有写实人体伤害。 |
| 性、脏话、毒品、赌博 | 无。波间强化是免费的三选一，不是抽卡，也不卖伤害。 |
| 用户互动 / UGC / 聊天 | 无。没有联机。 |
| 分享精确位置 | 无。 |
| 数字购买 | 当前包没有真支付。计划中的商品只有去除插屏和涂装。提交带真 IAP 的包时再改成“有”。 |
| 不受限制的互联网 | 当前没有广告 SDK。接入广告后再改。 |
| 目标受众 | 画面全年龄。是否勾选儿童，由开发者在 Console 确认。在确认前不要宣称“专为儿童设计”。 |

预期可能落在 Everyone / PEGI 3 / IARC 3+，以官方问卷结果为准。本仓库没有代填问卷。

## 数据安全表草稿（未提交）

当前这个 APK：**不收集、不上传**玩家数据。核心玩法不需要登录。本地只有最佳纪录、金币、四项整备等级、涂装、灵敏度、模拟“去除广告”标记、是否看过操作提示。

以后如果接上 AdMob 和 Play Billing，再改表。下面是计划中的答案，接 SDK 时对照 Google 的披露核对。

| 问题 | 当前包 | 接广告 / IAP 之后（计划） |
| --- | --- | --- |
| 是否收集或共享用户数据 | 否 | 是，主要由广告 SDK 和 Play 结算处理 |
| 账号、姓名、邮箱、电话 | 不收集 | 仍不收集。游戏内无登录 |
| 精确位置 | 不收集 | 不收集 |
| 大致位置 | 不收集 | TODO：以 AdMob 数据安全表为准。若广告 SDK 用 IP 推断大致位置，要申报，并写明不是游戏自己定位 |
| 广告 ID / 设备 ID | 不收集 | 收集并与 Google 共享，用于广告。核心玩法不强制 |
| 广告互动 | 不收集 | 由广告 SDK 收集 |
| 购买记录 | 不收集 | Play Billing 处理去除广告和涂装订单。开发者没有自己的支付服务器 |
| 应用内活动（波次、击杀） | 只在本地 | 仍只在本地，除非以后另加统计（现在没有） |
| 传输加密 | 没有第一方网络请求 | 广告和结算走 HTTPS |
| 用户能否要求删除 | 无账号。卸载或清除数据即可 | 同上。没有服务器账号可删 |
| 是否出售数据 | 否 | 否 |

## 图片（已放在仓库，尚未上传 Console）

| 素材 | 尺寸 | 文件 |
| --- | --- | --- |
| 高分辨率图标 | 512×512 PNG | [store/icon-512.png](store/icon-512.png) |
| 置顶大图 Feature graphic | 1024×500 PNG，无透明通道 | [store/feature-1024x500.png](store/feature-1024x500.png) |
| 手机截图 · 对局 | 1920×1080 PNG | [store/screenshot-gameplay-1920x1080.png](store/screenshot-gameplay-1920x1080.png) |
| 手机截图 · 整备 | 1920×1080 PNG | [store/screenshot-hub-1920x1080.png](store/screenshot-hub-1920x1080.png) |

两张截图来自横屏页面的真实界面：对局有波次、血量和触控按钮；整备有四项金币升级。没有真实旗帜或血腥。

启动器自适应图标没有换成这张 512 图。APK 仍用 `android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml`（背景色 + `mipmap/ic_launcher_foreground`）。Play 的高分辨率图标填 `store/icon-512.png`。若要桌面图标和商店图一致，再单独替换各档 `ic_launcher_foreground.png`。

还没做、提交前仍可空着：7 英寸和 10 英寸平板截图、YouTube 宣传视频。这些不是手机商品页的必填项。

## 签名与 AAB（只在本机构建，不上传）

`applicationId` 保持 `com.rocketeee.tankbattle3d`。

本地占位密钥**不是** Play 上传密钥。不要把它交给别人，不要上传到 Console。正式提交前，开发者自己另建一把上传密钥，并让 Play App Signing 保管应用签名密钥。

占位密钥只为了让 `bundleRelease` 能签出一个 AAB 做本地检查。生成命令（在仓库根目录）：

```bash
mkdir -p android/keystore
keytool -genkeypair -v \
  -keystore android/keystore/local-upload.jks \
  -alias upload \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -storepass local-dev-only -keypass local-dev-only \
  -dname "CN=Steve Zhou, O=rocketeee, C=US"
cp android/keystore.properties.example android/keystore.properties
```

`android/keystore.properties` 和 `*.jks` 已忽略，不会进 git。密码 `local-dev-only` 只属于这把本地占位钥匙。

```bash
export ANDROID_HOME=/path/to/android-sdk   # 需要本机 SDK，仓库不带
npm run android:bundle
# 产物：android/app/build/outputs/bundle/release/app-release.aab
```

没有 `keystore.properties` 时，`bundleRelease` 仍可打出**未签名** AAB，Play 不收。调试包：

```bash
npm run android:debug
# android/app/build/outputs/apk/debug/app-debug.apk
```

JDK 17 或 21 都可以。`ANDROID_HOME` 指向已安装的 platform 34 和 build-tools。

## 广告与支付接入口（仍是模拟）

规则没变，也没有加入带账号 ID 的 SDK。

- 频控：`src/game/ads.ts`
- 以后要换上的接口：`src/game/monetization.ts`（UMP、AdMob 激励/插屏、Play Billing）
- 空的环境变量样例：`.env.example`。即使填了 `VITE_ADMOB_APP_ID`，这一版也会继续走模拟，因为适配器还没写。
- 商品 id：`remove_ads`、`skin_berry`。没有伤害类商品，也没有金币礼包。金币只从对局结算来，整备满级后不再加战斗力。

接真 SDK 之前还要做完：确认 Pages 上的隐私 URL 能打开、数据安全表按 SDK 披露改写、IARC、单独的上传密钥。联系邮箱已经是 rocketeee@gmail.com。这些都还要开发者点头，本仓库不代提交，也不上传 AAB。
