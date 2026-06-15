# 上架 Google Play 指南（萌坦大战）

本文档说明如何把本项目的 Android 包（`app-release.aab`）上架到 Google Play。
构建命令见 `README` 与 PR #2；本文聚焦"发布"环节。

- **包名 (applicationId)**: `com.rocketeee.tankbattle3d`
- **应用名**: 萌坦大战
- **产物**: `android/app/build/outputs/bundle/release/app-release.aab`（已签名）
- **现成商店素材**（见 GitHub Release `v1.0.0`）:
  - `app-icon-512.png` — 应用图标（512×512）
  - `feature-graphic-1024x500.png` — 特色图片（1024×500）
  - `gameplay.mp4` / `gameplay.webp` — 宣传/预览视频
  - 手机截图：可从 `gameplay.mp4` 截取，或单独出图

---

## 1. 签名密钥（重要，务必先读）

Google Play **新应用默认启用 Play App Signing**：Google 托管"应用签名密钥"（永不丢失），
你只需要一个 **上传密钥 (upload key)** 来给上传的 AAB 签名。

当前 `app-release.aab` 是用一个**临时上传密钥**签的（仅存于构建机，未进仓库）：

| 项 | 值 |
|---|---|
| keystore | `android/tank-battle-3d-upload.jks`（已 gitignore，不在 GitHub 上）|
| alias | `tankbattle` |
| 证书有效期 | 至 2053 |
| SHA-1 | `F1:6A:78:A4:B3:B5:3A:EF:D9:72:1D:E7:98:32:C1:01:02:B2:49:FE` |

> ⚠️ 上传密钥**绝不能**提交到公开仓库。它丢失后可在 Play Console 重置（因为应用签名密钥由 Google 托管），但仍建议妥善备份。

**推荐做法：自己生成并掌管上传密钥**（一行命令，本地执行）：

```bash
keytool -genkeypair -v \
  -keystore upload-key.jks \
  -alias upload \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -storepass <你的强密码> -keypass <你的强密码> \
  -dname "CN=rocketeee, OU=, O=, L=, S=, C=CN"
```

把生成的 `upload-key.jks` 与密码填入 `android/keystore.properties`（参考下方），重新 `./gradlew bundleRelease` 即可得到用你自己的密钥签名的 AAB。

`android/keystore.properties` 格式（该文件已 gitignore）：

```properties
storeFile=upload-key.jks
storePassword=你的强密码
keyAlias=upload
keyPassword=你的强密码
```

---

## 2. 在 Play Console 创建应用

1. 打开 https://play.google.com/console → **创建应用**。
2. 应用名称：`萌坦大战`；默认语言：中文（简体）；类型：**游戏**；免费。
3. 勾选各项声明（开发者计划政策、美国出口法律）。

## 3. 填写商店资料 (Store listing)

- **应用图标**：512×512 PNG → 用 `app-icon-512.png`
- **特色图片**：1024×500 PNG → 用 `feature-graphic-1024x500.png`
- **手机截图**：2–8 张（最短边 ≥ 320px）→ 从 `gameplay.mp4` 截图即可
- **简短说明 / 完整说明**：示例见下
- **分类**：游戏 → 动作

简短说明示例：
> Q版萌系3D坦克大战！森林、沙漠、外星球三大关卡，击败小灰人与飞碟，挑战三大Boss。

## 4. 必填合规项

- **内容分级问卷**（Content rating）
- **数据安全表单**（Data safety）：本游戏纯本地运行、不收集用户数据，如实填写"不收集"
- **目标受众与内容**（Target audience）
- **隐私政策 URL**：需要一个公开网页（即使写"本应用不收集任何个人数据"也要有一个链接）

## 5. 上传 AAB 并发布

1. 左侧 **测试 → 内部测试**（建议先内部测试）或 **正式版**。
2. **创建新版本** → 上传 `app-release.aab`。
3. 首次会提示启用 **Play App Signing**，按默认接受即可。
4. 填写版本说明 → **保存 → 审核 → 发布**。
5. 首次审核通常需要数小时到数天。

---

## 6.（可选，进阶）用 API 自动上传

适合后续频繁更新时使用：

1. 在 Google Cloud 创建**服务账号**，生成 JSON 密钥。
2. 在 Play Console → **用户和权限** 中授予该服务账号"发布"权限。
3. 用 [fastlane supply](https://docs.fastlane.tools/actions/supply/) 或
   [Play Developer API](https://developers.google.com/android-publisher) 上传：

```bash
fastlane supply --aab app-release.aab --track internal --json_key service-account.json --package_name com.rocketeee.tankbattle3d
```

> 注意：API 只能上传二进制和部分元数据；**首次创建应用、商店资料、内容分级、数据安全**仍需在 Console 手动完成。
