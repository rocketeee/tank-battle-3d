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

**不要改包名。** 如果商店展示名想加英文，只改 Play 的应用标题（50 字以内），例如 `萌坦大战`。包名一旦上传过就不能换。没有“为了上架而改名”的必要。

## 隐私政策 URL

目标地址（Pages 打开之后）：

`https://rocketeee.github.io/tank-battle-3d/privacy.html`

页面源文件：`docs/privacy.html`（中英双语）。同一地址写在：

- `src/game/store.ts` 的 `PRIVACY_POLICY_URL`（主菜单「隐私政策」链接）
- `android/app/src/main/res/values/strings.xml` 的 `privacy_policy_url`
- `AndroidManifest.xml` 的 `meta-data` `privacy_policy_url`
- 本文件和 `README.md`

### 怎么让这个 URL 能打开

仓库里还不能替你打开 GitHub Pages 开关。合并到 `main` 之后：

1. 打开 GitHub 仓库 **Settings → Pages**。
2. **Build and deployment → Source** 选 **GitHub Actions**。
3. `.github/workflows/pages.yml` 会在推到 `main` 时把 `docs/` 发布出去。也可以在 Actions 里手动跑 `pages`。
4. 仓库需要是公开的，或者账号允许私有仓库使用 Pages。
5. 部署成功后打开上面的 URL，确认能看到中英政策，而不是 404。
6. 把 `docs/privacy.html` 里的 `TODO_CONTACT_EMAIL@example.com` 换成能收信的邮箱，再部署一次。这是占位，不是真实邮箱。

在 Pages 打开之前，用浏览器直接打开仓库里的 `docs/privacy.html` 可以审文案。Play Console 的隐私政策栏要等 URL 公网可访问再粘贴。

## 短说明（80 字以内）

中文（23 字）：

> Q版无尽坦克射击。波间三选一，涂装不含战斗力。

英文（73 字符）：

> Endless cute tank waves. Upgrades last one run. Skins don't add damage.

## 完整说明

中文：

> 萌坦大战是卡通坦克射击。没有通关结局：一波接一波，波间三选一强化只在本局有效，倒下后可以看一次激励复活（当前版本是模拟），然后结算，再点一次就重来。
>
> 左半屏移动，右半屏瞄准，按住开炮。打中头部会暴击。永久进度只有涂装和最佳纪录，涂装只改颜色，不加伤害。
>
> 当前安装包没有真实广告、没有真实支付、不需要登录。隐私政策说明了设备本地保存了什么，以及以后如果接入广告和“去除广告 / 涂装”时会怎样。

English:

> Tank Battle 3D is a cartoon tank shooter with no ending. Waves keep coming. Upgrades picked between waves last for that run only. After you fall you may take one rewarded revive (still a mock in this build), then settle and retry in one tap.
>
> Move on the left half of the screen, aim on the right, and hold fire. Headshots crit. Permanent progress is paints and your best run. Paints change color only and do not add damage.
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

当前这个 APK：**不收集、不上传**玩家数据。核心玩法不需要登录。本地只有最佳纪录、涂装、灵敏度、模拟“去除广告”标记。

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

## 图片尺寸清单（本 PR 不生成商店图）

| 素材 | 尺寸 | 格式 | 状态 |
| --- | --- | --- | --- |
| 高分辨率图标 | 512×512 | 32-bit PNG | 未做。启动器 mipmap 不能直接当这条 |
| 置顶大图 Feature graphic | 1024×500 | PNG 或 JPEG，不要透明通道问题 | 未做 |
| 手机截图 | 至少 2 张，最多 8 张。横屏建议 **1920×1080**（16:9）。短边 ≥ 320，长边 ≤ 3840 | PNG 或 JPEG | 未做。游戏是横屏 |
| 7 英寸平板截图 | 可选，同样 16:9 | PNG 或 JPEG | 可先不传 |
| 10 英寸平板截图 | 可选 | PNG 或 JPEG | 可先不传 |
| 宣传视频 | YouTube 公开链接 | 可选 | 未做 |

截图里不要出现真实旗帜、徽记或血腥。结算界面可以露出波次和击杀。

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
- 商品 id：`remove_ads`、`skin_berry`。没有伤害类商品。

接真 SDK 之前要做完：联系邮箱、Pages URL 可访问、数据安全表按 SDK 披露改写、IARC、单独的上传密钥。这些都还要开发者点头，本仓库不代提交。
